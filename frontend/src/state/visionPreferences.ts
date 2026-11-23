export type MotionSensitivity = "low" | "balanced" | "high";
export type CameraResolution = "720p" | "1080p";

export type VisionPreferences = {
  motionSensitivity: MotionSensitivity;
  cameraResolution: CameraResolution;
  mirrorPreview: boolean;
  showPoseOverlay: boolean;
};

const STORAGE_KEY = "flowstate.vision-preferences";

export const defaultVisionPreferences: VisionPreferences = {
  motionSensitivity: "balanced",
  cameraResolution: "720p",
  mirrorPreview: true,
  showPoseOverlay: true
};

export function readVisionPreferences(): VisionPreferences {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return { ...defaultVisionPreferences };

  try {
    const parsed = JSON.parse(saved) as Partial<VisionPreferences>;
    return {
      motionSensitivity: parsed.motionSensitivity === "low" || parsed.motionSensitivity === "high"
        ? parsed.motionSensitivity : "balanced",
      cameraResolution: parsed.cameraResolution === "1080p" ? "1080p" : "720p",
      mirrorPreview: typeof parsed.mirrorPreview === "boolean" ? parsed.mirrorPreview : true,
      showPoseOverlay: typeof parsed.showPoseOverlay === "boolean" ? parsed.showPoseOverlay : true
    };
  } catch {
    return { ...defaultVisionPreferences };
  }
}

export function saveVisionPreferences(preferences: VisionPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
