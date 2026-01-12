import { Injectable, signal, computed } from '@angular/core';

export type GestureType = 'none' | 'open' | 'pinch' | 'fist' | 'point';

export interface HandPosition {
  x: number;
  y: number;
  z: number;
}

export interface HandDelta {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

@Injectable({
  providedIn: 'root'
})
export class MediaPipeService {
  // Signals for reactive state
  private _handPosition = signal<HandPosition | null>(null);
  private _gesture = signal<GestureType>('none');
  private _isTracking = signal<boolean>(false);
  private _isInitialized = signal<boolean>(false);

  // Public readonly signals
  readonly handPosition = this._handPosition.asReadonly();
  readonly gesture = this._gesture.asReadonly();
  readonly isTracking = this._isTracking.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();

  // Previous position for delta calculation
  private previousPosition: HandPosition | null = null;
  private smoothedPosition: HandPosition | null = null;
  private smoothingFactor = 0.3;

  // MediaPipe objects
  private handLandmarker: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;

  // Computed values
  readonly isHandDetected = computed(() => this._handPosition() !== null);

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.videoElement = videoElement;

      // Dynamically import MediaPipe
      const vision = await import('@mediapipe/tasks-vision');
      const { HandLandmarker, FilesetResolver } = vision;

      // Initialize the vision fileset
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create hand landmarker
      this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this._isInitialized.set(true);
      console.log('MediaPipe Hand Tracking initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      return false;
    }
  }

  async startCamera(): Promise<boolean> {
    if (!this.videoElement) {
      console.error('Video element not set');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this._isTracking.set(true);
      this.startTracking();
      return true;
    } catch (error) {
      console.error('Failed to start camera:', error);
      return false;
    }
  }

  private startTracking(): void {
    if (!this.handLandmarker || !this.videoElement) return;

    let lastTime = -1;

    const detect = () => {
      if (!this._isTracking()) return;

      const now = performance.now();

      if (this.videoElement!.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        // Only process if enough time has passed (limit to ~30fps for performance)
        if (now - lastTime > 33) {
          const results = this.handLandmarker.detectForVideo(this.videoElement, now);
          this.processResults(results);
          lastTime = now;
        }
      }

      this.animationFrameId = requestAnimationFrame(detect);
    };

    detect();
  }

  private processResults(results: any): void {
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];

      // Get palm center (average of key points)
      const palmCenter = this.calculatePalmCenter(landmarks);

      // Apply smoothing
      if (this.smoothedPosition) {
        this.smoothedPosition = {
          x: this.smoothedPosition.x + (palmCenter.x - this.smoothedPosition.x) * this.smoothingFactor,
          y: this.smoothedPosition.y + (palmCenter.y - this.smoothedPosition.y) * this.smoothingFactor,
          z: this.smoothedPosition.z + (palmCenter.z - this.smoothedPosition.z) * this.smoothingFactor,
        };
      } else {
        this.smoothedPosition = palmCenter;
      }

      // Store previous before updating
      this.previousPosition = this._handPosition();

      // Update position (invert X for natural mirror effect)
      this._handPosition.set({
        x: 1 - this.smoothedPosition.x,
        y: this.smoothedPosition.y,
        z: this.smoothedPosition.z,
      });

      // Detect gesture
      const gesture = this.detectGesture(landmarks);
      this._gesture.set(gesture);
    } else {
      this._handPosition.set(null);
      this._gesture.set('none');
      this.smoothedPosition = null;
      this.previousPosition = null;
    }
  }

  private calculatePalmCenter(landmarks: HandLandmark[]): HandPosition {
    // Palm landmarks: 0 (wrist), 5, 9, 13, 17 (finger bases)
    const palmIndices = [0, 5, 9, 13, 17];
    let x = 0, y = 0, z = 0;

    palmIndices.forEach(i => {
      x += landmarks[i].x;
      y += landmarks[i].y;
      z += landmarks[i].z;
    });

    return {
      x: x / palmIndices.length,
      y: y / palmIndices.length,
      z: z / palmIndices.length,
    };
  }

  private detectGesture(landmarks: HandLandmark[]): GestureType {
    // Key landmarks:
    // 0: wrist
    // 4: thumb tip, 3: thumb IP
    // 8: index tip, 6: index PIP
    // 12: middle tip, 10: middle PIP
    // 16: ring tip, 14: ring PIP
    // 20: pinky tip, 18: pinky PIP

    const tips = [4, 8, 12, 16, 20];
    const pips = [3, 6, 10, 14, 18];

    // Count extended fingers
    let extendedFingers = 0;

    for (let i = 0; i < tips.length; i++) {
      const tipY = landmarks[tips[i]].y;
      const pipY = landmarks[pips[i]].y;

      // Finger is extended if tip is above PIP (y is inverted in video)
      if (tipY < pipY - 0.02) {
        extendedFingers++;
      }
    }

    // Check for pinch (thumb and index close together)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    if (pinchDistance < 0.08) {
      return 'pinch';
    }

    // Fist: no fingers extended
    if (extendedFingers <= 1) {
      return 'fist';
    }

    // Point: only index extended
    if (extendedFingers === 1 || extendedFingers === 2) {
      const indexExtended = landmarks[8].y < landmarks[6].y - 0.02;
      const middleExtended = landmarks[12].y < landmarks[10].y - 0.02;

      if (indexExtended && !middleExtended) {
        return 'point';
      }
    }

    // Open hand: most fingers extended
    if (extendedFingers >= 4) {
      return 'open';
    }

    return 'none';
  }

  getDelta(): HandDelta {
    const current = this._handPosition();
    const previous = this.previousPosition;

    if (!current || !previous) {
      return { deltaX: 0, deltaY: 0, deltaZ: 0 };
    }

    return {
      deltaX: current.x - previous.x,
      deltaY: current.y - previous.y,
      deltaZ: current.z - previous.z,
    };
  }

  stopTracking(): void {
    this._isTracking.set(false);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.videoElement?.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
  }

  dispose(): void {
    this.stopTracking();

    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }

    this._isInitialized.set(false);
  }
}
