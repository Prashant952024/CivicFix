import { type ChangeEvent } from "react";
import { VoiceInputButton, type VoiceTranscriptionPayload } from "@/components/citizen/voice-input-button";
import { useTranslation } from "@/lib/i18n";

export type VoiceTextFieldProps = {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onVoicePayload?: (payload: VoiceTranscriptionPayload) => void;
  fieldMode?: "title" | "description" | "notes" | "general";
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
};

export function VoiceTextField({
  id,
  name,
  label,
  value,
  onChange,
  onVoicePayload,
  fieldMode = "general",
  placeholder,
  required = false,
  multiline = false,
  rows = 4,
  maxLength,
  disabled = false,
  error,
  hint,
  className = "",
}: VoiceTextFieldProps) {
  const { t } = useTranslation();

  function handleTranscription(payload: VoiceTranscriptionPayload) {
    if (onVoicePayload) {
      onVoicePayload(payload);
    } else {
      // Default auto-population behavior if onVoicePayload not supplied
      const textToUse =
        fieldMode === "title" && payload.suggestedTitle
          ? payload.suggestedTitle
          : payload.transcription;

      if (!value.trim()) {
        onChange(textToUse);
      } else if (multiline) {
        onChange(`${value.trim()}\n\n${textToUse}`);
      } else {
        onChange(textToUse);
      }
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="block text-sm font-semibold text-foreground">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </label>
          {maxLength ? (
            <span className="text-xs text-muted-foreground">
              ({value.length}/{maxLength})
            </span>
          ) : null}
        </div>

        {/* Integrated Voice Input Button */}
        <VoiceInputButton
          fieldMode={fieldMode}
          disabled={disabled}
          currentValue={value}
          onLiveTranscript={onChange}
          onTranscription={handleTranscription}
          size="xs"
        />
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {multiline ? (
        <textarea
          id={id}
          name={name || id}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 leading-relaxed disabled:opacity-50"
        />
      ) : (
        <input
          id={id}
          name={name || id}
          type="text"
          maxLength={maxLength}
          disabled={disabled}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border/80 bg-background/70 px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
      )}

      {error ? <p className="text-xs font-medium text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
