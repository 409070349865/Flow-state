type OpenCvMat = {
  rows: number;
  cols: number;
  data: Uint8Array;
  copyTo(destination: OpenCvMat): void;
  delete(): void;
};

type OpenCvApi = {
  Mat: new () => OpenCvMat;
  Size: new (width: number, height: number) => unknown;
  cvtColor(source: OpenCvMat, destination: OpenCvMat, code: number): void;
  resize(source: OpenCvMat, destination: OpenCvMat, size: unknown, fx: number, fy: number, interpolation: number): void;
  absdiff(first: OpenCvMat, second: OpenCvMat, destination: OpenCvMat): void;
  threshold(source: OpenCvMat, destination: OpenCvMat, threshold: number, maxValue: number, type: number): void;
  countNonZero(source: OpenCvMat): number;
  imread(source: HTMLCanvasElement): OpenCvMat;
  COLOR_RGBA2GRAY: number;
  INTER_AREA: number;
  THRESH_BINARY: number;
};

let openCvPromise: Promise<OpenCvApi> | null = null;

function loadOpenCv(): Promise<OpenCvApi> {
  if (!openCvPromise) {
    openCvPromise = import("@techstark/opencv-js").then(async (loaded) => {
      const candidate = (loaded as unknown as { default?: OpenCvApi | Promise<OpenCvApi> }).default;
      if (!candidate) throw new Error("OpenCV.js did not initialize");
      if (candidate instanceof Promise) return await candidate;
      if (candidate.Mat) return candidate;
      return await new Promise<OpenCvApi>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("OpenCV.js took too long to initialize")), 25000);
        const module = candidate as OpenCvApi & { onRuntimeInitialized?: () => void };
        const previousHandler = module.onRuntimeInitialized;
        module.onRuntimeInitialized = () => {
          window.clearTimeout(timeout);
          previousHandler?.();
          resolve(module);
        };
      });
    });
  }
  return openCvPromise;
}

/** Low-resolution frame differencing powered by OpenCV.js. Video frames are sampled in memory and never retained. */
export class OpenCvMotionAnalyzer {
  private cv?: OpenCvApi;
  private canvas = document.createElement("canvas");
  private context = this.canvas.getContext("2d", { willReadFrequently: true });
  private previous?: OpenCvMat;
  private smoothedScore = 0;
  private sensitivity = 1;

  async initialize(sensitivity = 1) {
    this.cv = await loadOpenCv();
    this.sensitivity = sensitivity;
    this.canvas.width = 160;
    this.canvas.height = 90;
  }

  get ready() { return !!this.cv; }

  analyze(video: HTMLVideoElement): { score: number; changedPercent: number } | null {
    const cv = this.cv;
    if (!cv || !this.context || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    const rgba = cv.imread(this.canvas);
    const gray = new cv.Mat();
    const scaled = new cv.Mat();
    const difference = new cv.Mat();
    const changed = new cv.Mat();
    try {
      cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
      cv.resize(gray, scaled, new cv.Size(this.canvas.width, this.canvas.height), 0, 0, cv.INTER_AREA);
      if (!this.previous || this.previous.data.length !== scaled.data.length) {
        this.previous?.delete();
        this.previous = new cv.Mat();
        scaled.copyTo(this.previous);
        this.smoothedScore = 0;
        return { score: 0, changedPercent: 0 };
      }
      cv.absdiff(scaled, this.previous, difference);
      const pixelThreshold = this.sensitivity >= 1.3 ? 18 : this.sensitivity <= .75 ? 30 : 24;
      cv.threshold(difference, changed, pixelThreshold, 255, cv.THRESH_BINARY);
      const changedPercent = cv.countNonZero(changed) / (changed.rows * changed.cols) * 100;
      // Ignore sensor noise and use a short EMA so a single noisy frame does not look like an action.
      const rawScore = Math.min(1, Math.max(0, (changedPercent - 1.2) / 12 * this.sensitivity));
      this.smoothedScore = this.smoothedScore * .62 + rawScore * .38;
      scaled.copyTo(this.previous);
      return { score: this.smoothedScore, changedPercent };
    } finally {
      rgba.delete(); gray.delete(); scaled.delete(); difference.delete(); changed.delete();
    }
  }

  close() {
    this.previous?.delete();
    this.previous = undefined;
    this.cv = undefined;
    this.sensitivity = 1;
    this.smoothedScore = 0;
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
