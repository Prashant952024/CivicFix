import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Languages,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { getLanguageDisplayName, getLanguageNativeLabel, isRtlLanguage } from "@/lib/languages";
import {
  LiveSpeechRecognizer,
  isSpeechRecognitionSupported,
  getSpeechRecognitionLocale,
} from "@/lib/speech-recognition";
import { supabase } from "@/lib/supabase";

export type VoiceTranscriptionPayload = {
  transcription: string;
  englishTranslation: string;
  detectedLanguage: string;
  languageName: string;
  suggestedTitle?: string;
  suggestedEnglishTitle?: string;
  script?: string;
  isRtl?: boolean;
  confidence?: number;
  fieldMode?: "title" | "description" | "notes" | "general";
};

export type VoiceErrorCode =
  | "MICROPHONE_PERMISSION_DENIED"
  | "RECORDING_FAILED"
  | "UNSUPPORTED_BROWSER"
  | "UNSUPPORTED_AUDIO_FORMAT"
  | "EMPTY_AUDIO"
  | "AUDIO_TOO_SHORT"
  | "UPLOAD_FAILED"
  | "EDGE_FUNCTION_FAILED"
  | "GEMINI_API_FAILED"
  | "NO_SPEECH_DETECTED"
  | "LANGUAGE_NOT_SUPPORTED"
  | "LOW_CONFIDENCE_TRANSCRIPTION"
  | "TRANSLATION_FAILED"
  | "INVALID_AI_RESPONSE"
  | "UNKNOWN_ERROR";

type VoiceInputButtonProps = {
  onTranscription: (payload: VoiceTranscriptionPayload) => void;
  onLiveTranscript?: (liveText: string) => void;
  currentValue?: string;
  fieldMode?: "title" | "description" | "notes" | "general";
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
  variant?: "default" | "outline" | "ghost" | "pill";
  size?: "default" | "sm" | "xs" | "icon";
};

type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "transcribing"
  | "reviewing"
  | "success"
  | "error";

export function VoiceInputButton({
  onTranscription,
  onLiveTranscript,
  currentValue = "",
  fieldMode = "description",
  disabled = false,
  className = "",
  buttonLabel,
  variant = "outline",
  size = "sm",
}: VoiceInputButtonProps) {
  const { t, language } = useTranslation();
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<VoiceErrorCode | null>(null);
  const [pendingPayload, setPendingPayload] = useState<VoiceTranscriptionPayload | null>(null);
  const [editableTranscription, setEditableTranscription] = useState("");
  const [editableEnglishTranslation, setEditableEnglishTranslation] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const liveRecognizerRef = useRef<LiveSpeechRecognizer | null>(null);
  const baseTextRef = useRef<string>("");
  const liveAccumulatedRef = useRef<string>("");

  // Clean up media stream, speech recognizer, and timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (liveRecognizerRef.current) {
        liveRecognizerRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function getSupportedMimeType(): string {
    if (typeof MediaRecorder === "undefined") return "";
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch {
        // continue checking next candidate
      }
    }
    return "";
  }

  function getLocalizedErrorMessage(code: VoiceErrorCode, fallback?: string): string {
    const localized = t(`citizen.report.voice.errors.${code}`);
    if (localized && !localized.startsWith("citizen.report.voice.errors.")) {
      return localized;
    }
    return fallback || t("citizen.report.voice.transcriptionFailed") || "Voice transcription could not be completed. Please try again or type manually.";
  }

  async function startRecording() {
    setErrorMessage(null);
    setErrorCode(null);
    setPendingPayload(null);
    setIsReviewOpen(false);

    baseTextRef.current = (currentValue || "").trim();
    liveAccumulatedRef.current = "";

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorCode("UNSUPPORTED_BROWSER");
      setErrorMessage(getLocalizedErrorMessage("UNSUPPORTED_BROWSER"));
      return;
    }

    try {
      setState("requesting_permission");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Start Browser Live Speech Recognition if supported (Fast Path: Google-Search Style)
      if (isSpeechRecognitionSupported()) {
        try {
          const recognizer = new LiveSpeechRecognizer();
          liveRecognizerRef.current = recognizer;
          recognizer.start({
            lang: getSpeechRecognitionLocale(language),
            onInterim: (_interimChunk, fullLiveText) => {
              if (!fullLiveText) return;
              const combined = baseTextRef.current
                ? (fieldMode === "description" ? `${baseTextRef.current}\n\n${fullLiveText}` : `${baseTextRef.current} ${fullLiveText}`)
                : fullLiveText;
              onLiveTranscript?.(combined);
            },
            onFinalSegment: (_finalChunk, fullAccumulated) => {
              if (!fullAccumulated) return;
              liveAccumulatedRef.current = fullAccumulated;
              const combined = baseTextRef.current
                ? (fieldMode === "description" ? `${baseTextRef.current}\n\n${fullAccumulated}` : `${baseTextRef.current} ${fullAccumulated}`)
                : fullAccumulated;
              onLiveTranscript?.(combined);
            },
            onEnd: (finalFullText) => {
              if (finalFullText) {
                liveAccumulatedRef.current = finalFullText;
              }
            },
            onError: (recErr) => {
              console.warn("[VoiceInput] Live recognition notice:", recErr);
            },
          });
        } catch (recInitErr) {
          console.warn("[VoiceInput] Live speech recognizer failed to start, continuing with audio recorder fallback:", recInitErr);
        }
      }

      const detectedMimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = detectedMimeType ? { mimeType: detectedMimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Release mic hardware immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const durationMs = Date.now() - recordingStartTimeRef.current;
        const effectiveMime = recorder.mimeType || detectedMimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: effectiveMime });
        const liveText = liveAccumulatedRef.current.trim();

        if (durationMs < 500 && !liveText && recordedBlob.size < 250) {
          console.warn("[VoiceInput] Audio recording is too short or empty:", recordedBlob.size, "bytes,", durationMs, "ms");
          setState("error");
          setErrorCode("AUDIO_TOO_SHORT");
          setErrorMessage(getLocalizedErrorMessage("AUDIO_TOO_SHORT"));
          return;
        }

        await processAudioTranscription(recordedBlob, effectiveMime, liveText);
      };

      recorder.start(250); // Collect chunks every 250ms
      setState("recording");
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Max 60 seconds auto-stop limit
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error("[VoiceInput] Microphone permission/stream error:", err);
      setState("error");
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setErrorCode("MICROPHONE_PERMISSION_DENIED");
        setErrorMessage(getLocalizedErrorMessage("MICROPHONE_PERMISSION_DENIED"));
      } else {
        setErrorCode("RECORDING_FAILED");
        setErrorMessage(getLocalizedErrorMessage("RECORDING_FAILED"));
      }
    }
  }

  function stopRecording() {
    if (liveRecognizerRef.current && liveRecognizerRef.current.isListening()) {
      try {
        const finalTxt = liveRecognizerRef.current.stop();
        if (finalTxt) {
          liveAccumulatedRef.current = finalTxt;
        }
      } catch (e) {
        console.warn("[VoiceInput] Error stopping LiveSpeechRecognizer:", e);
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (stopErr) {
        console.warn("[VoiceInput] Error stopping MediaRecorder:", stopErr);
      }
    }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(",")[1];
        if (base64Data) {
          resolve(base64Data);
        } else {
          reject(new Error("Failed to encode audio data."));
        }
      };
      reader.onerror = () => reject(new Error("File reading error."));
      reader.readAsDataURL(blob);
    });
  }

  async function processAudioTranscription(audioBlob: Blob, mimeType: string, liveRecognizedText?: string) {
    setState("transcribing");
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const invokeRes = await supabase.functions.invoke<{
        success?: boolean;
        errorCode?: string;
        userMessage?: string;
        transcription?: string;
        text?: string;
        englishTranslation?: string;
        suggestedTitle?: string;
        suggestedEnglishTitle?: string;
        detectedLanguage?: string;
        detectedLanguageName?: string;
        languageName?: string;
        detectedScript?: string;
        script?: string;
        isRtl?: boolean;
        confidence?: number;
      }>("transcribe-voice", {
        body: {
          audioBase64,
          mimeType,
          languageHint: language,
          fieldMode,
        },
      });

      if (invokeRes.error) {
        if (liveRecognizedText && liveRecognizedText.trim()) {
          console.warn("[VoiceInput] Edge Function failed, but browser live text is available. Using live text as fallback.");
          const transcription = liveRecognizedText.trim();
          const payload: VoiceTranscriptionPayload = {
            transcription,
            englishTranslation: transcription,
            detectedLanguage: language || "en",
            languageName: getLanguageDisplayName(language),
            confidence: 0.85,
            fieldMode,
          };
          setPendingPayload(payload);
          setEditableTranscription(transcription);
          setEditableEnglishTranslation(transcription);
          setState("reviewing");
          setIsReviewOpen(true);
          return;
        }

        const returnedCode: VoiceErrorCode = "EDGE_FUNCTION_FAILED";
        setErrorCode(returnedCode);
        throw new Error(invokeRes.error.message || getLocalizedErrorMessage(returnedCode));
      }

      const data = invokeRes.data || {};

      if (!data.success && data.errorCode) {
        if (liveRecognizedText && liveRecognizedText.trim()) {
          console.warn("[VoiceInput] Gemini returned non-success, using browser live transcript fallback.");
          const transcription = liveRecognizedText.trim();
          const payload: VoiceTranscriptionPayload = {
            transcription,
            englishTranslation: transcription,
            detectedLanguage: language || "en",
            languageName: getLanguageDisplayName(language),
            confidence: 0.85,
            fieldMode,
          };
          setPendingPayload(payload);
          setEditableTranscription(transcription);
          setEditableEnglishTranslation(transcription);
          setState("reviewing");
          setIsReviewOpen(true);
          return;
        }
        const code = (data.errorCode as VoiceErrorCode) || "EDGE_FUNCTION_FAILED";
        setErrorCode(code);
        throw new Error(data.userMessage || getLocalizedErrorMessage(code));
      }

      const rawText = data.transcription || data.text || liveRecognizedText;
      if (!rawText || String(rawText).trim().length === 0) {
        setErrorCode("NO_SPEECH_DETECTED");
        throw new Error(getLocalizedErrorMessage("NO_SPEECH_DETECTED"));
      }

      const transcription = String(rawText).trim();
      const englishTranslation = String(data.englishTranslation || transcription).trim();
      const detectedLanguage = String(data.detectedLanguage || language).toLowerCase();
      const languageName = String(data.detectedLanguageName || data.languageName || getLanguageDisplayName(detectedLanguage));
      const script = String(data.detectedScript || data.script || "");
      const isRtl = Boolean(data.isRtl || isRtlLanguage(detectedLanguage));

      const payload: VoiceTranscriptionPayload = {
        transcription,
        englishTranslation,
        detectedLanguage,
        languageName,
        script,
        isRtl,
        suggestedTitle: data.suggestedTitle ? String(data.suggestedTitle).trim() : undefined,
        suggestedEnglishTitle: data.suggestedEnglishTitle ? String(data.suggestedEnglishTitle).trim() : undefined,
        confidence: data.confidence ?? 0.9,
        fieldMode,
      };

      const initialEnglish =
        fieldMode === "title" && payload.suggestedEnglishTitle
          ? payload.suggestedEnglishTitle
          : englishTranslation;

      setPendingPayload(payload);
      setEditableTranscription(transcription);
      setEditableEnglishTranslation(initialEnglish);
      setState("reviewing");
      setIsReviewOpen(true);
    } catch (err: unknown) {
      console.error("[VoiceInput] Transcription failed:", err);
      if (liveRecognizedText && liveRecognizedText.trim()) {
        const transcription = liveRecognizedText.trim();
        const payload: VoiceTranscriptionPayload = {
          transcription,
          englishTranslation: transcription,
          detectedLanguage: language || "en",
          languageName: getLanguageDisplayName(language),
          confidence: 0.85,
          fieldMode,
        };
        setPendingPayload(payload);
        setEditableTranscription(transcription);
        setEditableEnglishTranslation(transcription);
        setState("reviewing");
        setIsReviewOpen(true);
        return;
      }
      setState("error");
      if (!errorCode) {
        setErrorCode("GEMINI_API_FAILED");
      }
      setErrorMessage(
        err instanceof Error ? err.message : getLocalizedErrorMessage("UNKNOWN_ERROR"),
      );
    }
  }

  function handleAcceptReview() {
    if (!pendingPayload) return;
    const finalOriginal = editableTranscription.trim() || pendingPayload.transcription;
    const finalEnglish =
      pendingPayload.detectedLanguage === "en"
        ? finalOriginal
        : editableEnglishTranslation.trim() || finalOriginal || pendingPayload.englishTranslation;

    const finalPayload: VoiceTranscriptionPayload = {
      ...pendingPayload,
      transcription: finalOriginal,
      englishTranslation: finalEnglish,
      suggestedTitle: fieldMode === "title" ? finalOriginal : pendingPayload.suggestedTitle,
      suggestedEnglishTitle: fieldMode === "title" ? finalEnglish : pendingPayload.suggestedEnglishTitle,
    };
    onTranscription(finalPayload);
    setIsReviewOpen(false);
    setState("success");
    setTimeout(() => {
      setState("idle");
    }, 3500);
  }

  function handleDiscard() {
    setIsReviewOpen(false);
    setPendingPayload(null);
    setState("idle");
  }

  function handleRetryFromModal() {
    setIsReviewOpen(false);
    setPendingPayload(null);
    void startRecording();
  }

  const defaultButtonText =
    buttonLabel ||
    (fieldMode === "title"
      ? t("citizen.report.voice.speakTitle")
      : fieldMode === "notes"
      ? t("citizen.report.voice.speakNotes")
      : t("citizen.report.voice.speakDescription"));

  return (
    <div className={`inline-block ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <Button
            type="button"
            variant={variant === "pill" ? "outline" : variant}
            size={size}
            disabled={disabled}
            onClick={startRecording}
            className="flex items-center gap-1.5 border-teal-200 bg-teal-50/70 text-[#0f766e] hover:bg-teal-100 hover:text-teal-900 transition-colors shadow-xs cursor-pointer font-semibold text-xs"
            aria-label={`${defaultButtonText} (${fieldMode})`}
            title={defaultButtonText}
          >
            <Mic className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
            <span>{defaultButtonText}</span>
          </Button>
        )}

        {state === "requesting_permission" && (
          <Button type="button" variant="outline" size={size} disabled className="flex items-center gap-1.5 bg-muted/60 text-xs" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
            <span>{t("citizen.report.voice.connectingMic") || "Connecting microphone..."}</span>
          </Button>
        )}

        {state === "recording" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/95 px-3 py-1 text-xs shadow-xs animate-in fade-in duration-150" role="status" aria-live="polite">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            <span className="font-bold text-red-900">
              {t("citizen.report.voice.listening")} ({formatDuration(recordingSeconds)})
            </span>
            <Button
              type="button"
              variant="default"
              size="xs"
              onClick={stopRecording}
              className="bg-red-600 text-white hover:bg-red-700 h-6 px-2 text-[11px] cursor-pointer ml-1"
              aria-label={t("citizen.report.voice.stop")}
            >
              <Square className="h-2.5 w-2.5 mr-1 fill-current" aria-hidden="true" />
              <span>{t("citizen.report.voice.stop")}</span>
            </Button>
          </div>
        )}

        {state === "transcribing" && (
          <div className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/90 px-3 py-1 text-xs text-sky-900 shadow-xs animate-pulse" role="status" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden="true" />
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            <span className="font-semibold">{t("citizen.report.voice.transcribing")}</span>
          </div>
        )}

        {state === "success" && pendingPayload && (
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="sm" className="flex items-center gap-1.5 py-0.5 px-2 text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{getLanguageDisplayName(pendingPayload.detectedLanguage)}</span>
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={startRecording}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer h-7"
              aria-label={t("citizen.report.voice.recordAgain")}
            >
              <Mic className="h-3 w-3 mr-1" aria-hidden="true" />
              <span>{t("citizen.report.voice.recordAgain")}</span>
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={startRecording}
              className="flex items-center gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs cursor-pointer h-7"
              aria-label={t("citizen.report.voice.recordAgain")}
            >
              <MicOff className="h-3 w-3 text-amber-700" aria-hidden="true" />
              <span>{t("citizen.report.voice.recordAgain")}</span>
            </Button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-1.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" role="alert">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Voice Review & Correction Dialog */}
      {isReviewOpen && pendingPayload && (
        <Dialog
          open={isReviewOpen}
          onClose={handleDiscard}
          title={t("citizen.report.voice.reviewTitle")}
          maxWidth="lg"
        >
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50/80 border border-teal-200/80 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-teal-900">
                <Languages className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>
                  {t("citizen.report.voice.detectedLanguageLabel", {
                    language: getLanguageDisplayName(pendingPayload.detectedLanguage),
                  })}
                </span>
              </div>
              {pendingPayload.detectedLanguage !== language && (
                <Badge variant="outline" size="sm" className="bg-white border-teal-300 text-teal-900 text-[10px]">
                  {t("citizen.report.voice.uiLanguageHint", {
                    language: getLanguageNativeLabel(language),
                  })}
                </Badge>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("citizen.report.voice.originalTextLabel")} ({getLanguageNativeLabel(pendingPayload.detectedLanguage)})
              </label>
              <textarea
                value={editableTranscription}
                onChange={(e) => setEditableTranscription(e.target.value)}
                dir={pendingPayload.isRtl ? "rtl" : "ltr"}
                rows={fieldMode === "title" ? 2 : 4}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 leading-relaxed outline-none"
                placeholder={t("citizen.report.voice.originalPlaceholder") || "Review or edit spoken complaint..."}
              />
            </div>

            {pendingPayload.detectedLanguage !== "en" && (
              <div>
                <label className="block text-xs font-semibold text-sky-900 uppercase tracking-wider mb-1">
                  {t("citizen.report.voice.englishTranslationLabel")} (Canonical English)
                </label>
                <textarea
                  value={editableEnglishTranslation}
                  onChange={(e) => setEditableEnglishTranslation(e.target.value)}
                  rows={fieldMode === "title" ? 2 : 3}
                  className="w-full rounded-xl border border-sky-300/80 bg-sky-50/50 px-3 py-2 text-sm text-sky-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 leading-relaxed outline-none"
                  placeholder="English translation for municipal triage..."
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                className="flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("citizen.report.voice.discard")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryFromModal}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("citizen.report.voice.recordAgain")}</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAcceptReview}
                className="flex items-center gap-1.5 bg-primary text-white font-semibold cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{t("citizen.report.voice.useTranscription")}</span>
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
