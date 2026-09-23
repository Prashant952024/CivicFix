import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

type VoiceInputButtonProps = {
  onTranscription: (text: string, detectedLanguage?: string) => void;
  disabled?: boolean;
  className?: string;
};

type RecordingState = "idle" | "requesting_permission" | "recording" | "transcribing" | "success" | "error";

export function VoiceInputButton({ onTranscription, disabled = false, className = "" }: VoiceInputButtonProps) {
  const { t, language } = useTranslation();
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedLangInfo, setDetectedLangInfo] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up media stream and timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
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
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }

  async function startRecording() {
    setErrorMessage(null);
    setDetectedLangInfo(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage(t("citizen.report.voice.micNotSupported"));
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

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

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

        // Stop all tracks to release mic hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });

        if (recordedBlob.size === 0) {
          setState("idle");
          return;
        }

        await processAudioTranscription(recordedBlob, recorder.mimeType || mimeType || "audio/webm");
      };

      recorder.start(250); // Collect data every 250ms
      setState("recording");
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Max 60 seconds auto-stop
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error("[VoiceInput] Microphone access failed", err);
      setState("error");
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setErrorMessage(t("citizen.report.voice.micPermissionDenied"));
      } else {
        setErrorMessage(t("citizen.report.voice.micNotSupported"));
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
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
          reject(new Error("Failed to convert audio to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function processAudioTranscription(audioBlob: Blob, mimeType: string) {
    setState("transcribing");
    setErrorMessage(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Supabase configuration is missing.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          languageHint: language,
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `Transcription request failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (!data.text) {
        throw new Error("No transcription text returned from AI service.");
      }

      const transcribedText = data.text as string;
      const detectedLang = (data.detectedLanguage as string) || language;
      const languageName = (data.languageName as string) || detectedLang;

      onTranscription(transcribedText, detectedLang);
      setState("success");
      setDetectedLangInfo(languageName);

      // Reset back to idle after 4 seconds
      setTimeout(() => {
        setState("idle");
      }, 4000);
    } catch (err: unknown) {
      console.error("[VoiceInput] Transcription failed", err);
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("citizen.report.voice.transcriptionFailed"),
      );
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={startRecording}
            className="flex items-center gap-2 border-teal-200 bg-teal-50/70 text-[#0f766e] hover:bg-teal-100 hover:text-teal-900 transition-colors shadow-sm"
          >
            <Mic className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
            <span className="font-semibold text-xs">{t("citizen.report.voice.speakButton")}</span>
          </Button>
        )}

        {state === "requesting_permission" && (
          <Button type="button" variant="outline" size="sm" disabled className="flex items-center gap-2 bg-muted/60">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-xs">{t("citizen.report.voice.speakButton")}...</span>
          </Button>
        )}

        {state === "recording" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-1.5 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <span className="text-xs font-bold text-red-900">
              {t("citizen.report.voice.listening")} ({formatDuration(recordingSeconds)})
            </span>
            <Button
              type="button"
              variant="default"
              size="xs"
              onClick={stopRecording}
              className="bg-red-600 text-white hover:bg-red-700 ml-1.5 h-7 px-2.5"
            >
              <Square className="h-3 w-3 mr-1 fill-current" aria-hidden="true" />
              <span>{t("citizen.report.voice.stop")}</span>
            </Button>
          </div>
        )}

        {state === "transcribing" && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/90 px-3 py-1.5 text-xs text-sky-900 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden="true" />
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            <span className="font-semibold">{t("citizen.report.voice.transcribing")}</span>
          </div>
        )}

        {state === "success" && (
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="sm" className="flex items-center gap-1.5 py-1 px-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{t("citizen.report.voice.detectedLanguage", { language: detectedLangInfo || "AI" })}</span>
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={startRecording}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Mic className="h-3 w-3 mr-1" aria-hidden="true" />
              <span>Record Again</span>
            </Button>
          </div>
        )}

        {state === "error" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs"
          >
            <MicOff className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>Retry Voice</span>
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
