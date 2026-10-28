export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export interface CbtTimerConfig {
  startedAtIso: string;
  serverNowIso: string;
  durationSeconds: number;
  onTick?: (remainingSeconds: number) => void;
  onTimeExpired?: () => void;
  onBackgroundWarning?: (backgroundSeconds: number) => void;
}

export class CbtTimer {
  private durationSeconds: number;
  private clientStartTime: number;
  private initialElapsedSeconds: number;
  private intervalId: any = null;
  private isRunning: boolean = false;
  private backgroundTimestamp: number | null = null;
  private backgroundEventCount: number = 0;

  private onTick?: (remainingSeconds: number) => void;
  private onTimeExpired?: () => void;
  private onBackgroundWarning?: (backgroundSeconds: number) => void;
  private appStateSubscription: any = null;

  constructor(config: CbtTimerConfig) {
    this.durationSeconds = config.durationSeconds;
    this.onTick = config.onTick;
    this.onTimeExpired = config.onTimeExpired;
    this.onBackgroundWarning = config.onBackgroundWarning;

    const serverNow = new Date(config.serverNowIso).getTime();
    const serverStarted = new Date(config.startedAtIso).getTime();

    this.initialElapsedSeconds = Math.max(0, Math.floor((serverNow - serverStarted) / 1000));
    this.clientStartTime = Date.now();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Tick every 1000ms
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    // Initial tick
    this.tick();

    // AppState listener for background tracking with 5s grace period
    try {
      // Dynamic lookup so pure Node.js environments can run unit tests without Flow transpilation
      const RN = typeof require !== 'undefined' ? require('react-native') : null;
      if (RN?.AppState?.addEventListener) {
        this.appStateSubscription = RN.AppState.addEventListener(
          "change",
          (nextState: AppStateStatus) => {
            this.handleAppStateChange(nextState);
          }
        );
      }
    } catch {
      // Running outside RN runtime
    }
  }

  private tick() {
    const remaining = this.getRemainingSeconds();
    if (this.onTick) {
      this.onTick(remaining);
    }

    if (remaining <= 0) {
      this.stop();
      if (this.onTimeExpired) {
        this.onTimeExpired();
      }
    }
  }

  public getRemainingSeconds(): number {
    const elapsedSinceStart = Math.floor((Date.now() - this.clientStartTime) / 1000);
    const totalElapsed = this.initialElapsedSeconds + elapsedSinceStart;
    return Math.max(0, this.durationSeconds - totalElapsed);
  }

  public getBackgroundEventCount(): number {
    return this.backgroundEventCount;
  }

  private handleAppStateChange(nextState: AppStateStatus) {
    if (nextState === "background" || nextState === "inactive") {
      if (!this.backgroundTimestamp) {
        this.backgroundTimestamp = Date.now();
      }
    } else if (nextState === "active") {
      if (this.backgroundTimestamp) {
        const backgroundDurationSecs = Math.floor(
          (Date.now() - this.backgroundTimestamp) / 1000
        );
        this.backgroundTimestamp = null;

        // 5-second grace period for notification shade or brief phone call
        if (backgroundDurationSecs > 5) {
          this.backgroundEventCount += 1;
          if (this.onBackgroundWarning) {
            this.onBackgroundWarning(backgroundDurationSecs);
          }
        }
      }
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.appStateSubscription?.remove) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export function calculateRemainingSeconds(targetTimestamp: number, currentTimestamp: number = Date.now()): number {
  return Math.max(0, Math.floor((targetTimestamp - currentTimestamp) / 1000));
}

export function formatTimeRemaining(seconds: number): string {
  const safeSecs = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

