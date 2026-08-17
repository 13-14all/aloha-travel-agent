import { describe, expect, it } from "vitest";
import {
  getVoiceFileExtension,
  getVoiceRecordingError,
  isSupportedVoiceMimeType,
  MAX_VOICE_AUDIO_BYTES,
  VOICE_MIME_TYPES,
} from "./voice";

describe("voice input helpers", () => {
  it("accepts the browser audio formats supported by the transcription service", () => {
    expect(VOICE_MIME_TYPES).toContain("audio/webm");
    expect(VOICE_MIME_TYPES).toContain("audio/ogg");
    expect(VOICE_MIME_TYPES).toContain("audio/mp4");
    expect(isSupportedVoiceMimeType("audio/webm")).toBe(true);
    expect(isSupportedVoiceMimeType("video/webm")).toBe(false);
  });

  it("uses an appropriate file extension for each accepted format", () => {
    expect(getVoiceFileExtension("audio/webm")).toBe("webm");
    expect(getVoiceFileExtension("audio/mp4")).toBe("m4a");
    expect(getVoiceFileExtension("audio/mpeg")).toBe("mp3");
  });

  it("rejects empty and oversized recordings before upload", () => {
    expect(getVoiceRecordingError(0)).toContain("didn't receive");
    expect(getVoiceRecordingError(MAX_VOICE_AUDIO_BYTES + 1)).toContain("under 12 MB");
    expect(getVoiceRecordingError(MAX_VOICE_AUDIO_BYTES)).toBeNull();
  });
});
