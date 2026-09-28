import { LANGUAGE_CONFIG, type LanguageCode } from "@/lib/languages";

// Types for Web Speech API SpeechRecognition
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): SpeechRecognitionResultLike;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface BrowserSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
  }
}

/**
 * Checks if the current browser environment supports the Web Speech API (SpeechRecognition).
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Maps a CivicFix language code (e.g. 'hi', 'mr', 'ta', 'en') to a standard BCP-47 locale tag
 * recognized by browser SpeechRecognition engines.
 */
export function getSpeechRecognitionLocale(languageCode?: string | null): string {
  if (!languageCode) return "en-IN";
  const normalized = languageCode.trim().toLowerCase() as LanguageCode;
  const config = LANGUAGE_CONFIG[normalized];
  if (config && config.locale) {
    return config.locale;
  }
  return "en-IN";
}

export type LiveSpeechRecognizerCallbacks = {
  onStart?: () => void;
  onInterim?: (interimChunk: string, fullLiveText: string) => void;
  onFinalSegment?: (finalChunk: string, fullAccumulatedText: string) => void;
  onEnd?: (finalFullText: string) => void;
  onError?: (error: string) => void;
};

/**
 * Encapsulates browser-native live streaming speech recognition with robust
 * interim/final result concatenation, continuous listening, and cleanup.
 */
export class LiveSpeechRecognizer {
  private recognition: BrowserSpeechRecognitionInstance | null = null;
  private accumulatedFinalText = "";
  private currentInterimText = "";
  private isRunning = false;
  private callbacks: LiveSpeechRecognizerCallbacks = {};

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        try {
          this.recognition = new SpeechRecognitionConstructor();
        } catch (e) {
          console.warn("[LiveSpeechRecognizer] Failed to initialize SpeechRecognition:", e);
          this.recognition = null;
        }
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public isListening(): boolean {
    return this.isRunning;
  }

  public start(options: { lang?: string } & LiveSpeechRecognizerCallbacks = {}) {
    if (!this.recognition) {
      options.onError?.("UNSUPPORTED_BROWSER");
      return;
    }

    if (this.isRunning) {
      this.abort();
    }

    this.callbacks = options;
    this.accumulatedFinalText = "";
    this.currentInterimText = "";

    const targetLang = options.lang || "en-IN";
    this.recognition.lang = targetLang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRunning = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimStr = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) {
            this.accumulatedFinalText = this.accumulatedFinalText
              ? `${this.accumulatedFinalText} ${trimmed}`
              : trimmed;
            this.callbacks.onFinalSegment?.(trimmed, this.accumulatedFinalText);
          }
        } else {
          interimStr += transcript;
        }
      }

      this.currentInterimText = interimStr.trim();
      const fullLiveText = this.getFullTranscript();
      this.callbacks.onInterim?.(this.currentInterimText, fullLiveText);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      console.warn("[LiveSpeechRecognizer] Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.callbacks.onError?.("MICROPHONE_PERMISSION_DENIED");
      } else if (event.error === "no-speech") {
        // No speech detected in current window, keep listening if continuous
      } else {
        this.callbacks.onError?.(event.error || "RECORDING_FAILED");
      }
    };

    this.recognition.onend = () => {
      this.isRunning = false;
      const finalResult = this.getFullTranscript();
      this.callbacks.onEnd?.(finalResult);
    };

    try {
      this.recognition.start();
    } catch (startErr) {
      console.warn("[LiveSpeechRecognizer] start() error:", startErr);
      this.isRunning = false;
      this.callbacks.onError?.("RECORDING_FAILED");
    }
  }

  public getFullTranscript(): string {
    const finalTrimmed = this.accumulatedFinalText.trim();
    const interimTrimmed = this.currentInterimText.trim();
    if (finalTrimmed && interimTrimmed) {
      return `${finalTrimmed} ${interimTrimmed}`;
    }
    return finalTrimmed || interimTrimmed || "";
  }

  public stop(): string {
    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch {
        // ignore if already stopped
      }
    }
    this.isRunning = false;
    return this.getFullTranscript();
  }

  public abort() {
    if (this.recognition && this.isRunning) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.isRunning = false;
    this.accumulatedFinalText = "";
    this.currentInterimText = "";
  }
}
