export const VOICE_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

export type VoiceMimeType = (typeof VOICE_MIME_TYPES)[number];

export const MAX_VOICE_AUDIO_BYTES = 12 * 1024 * 1024;

export function isSupportedVoiceMimeType(mimeType: string): mimeType is VoiceMimeType {
  return (VOICE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getVoiceFileExtension(mimeType: VoiceMimeType): string {
  const extensions: Record<VoiceMimeType, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return extensions[mimeType];
}

export function getVoiceRecordingError(byteLength: number): string | null {
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    return "I didn't receive a recording. Please try again.";
  }
  if (byteLength > MAX_VOICE_AUDIO_BYTES) {
    return "Please keep voice recordings under 12 MB and try again.";
  }
  return null;
}
