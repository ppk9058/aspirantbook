// ─────────────────────────────────────────────────────────────────
// Drift-Compensated Tamper-Proof Web Worker Timer
// Runs on a separate background thread immune to main-thread throttling
// ─────────────────────────────────────────────────────────────────

let intervalId = null;
let endTime = null;
let paused = false;
let remaining = 0;

self.onmessage = function (e) {
    const { action, durationSecs } = e.data;

    if (action === "START") {
        if (intervalId) clearInterval(intervalId);
        remaining = durationSecs;
        endTime = Date.now() + durationSecs * 1000;
        paused = false;

        intervalId = setInterval(() => {
            if (!paused) {
                const now = Date.now();
                const diff = Math.max(0, Math.round((endTime - now) / 1000));
                remaining = diff;

                self.postMessage({
                    type: "TICK",
                    timeLeft: diff,
                });

                if (diff <= 0) {
                    clearInterval(intervalId);
                    intervalId = null;
                    self.postMessage({ type: "EXPIRED" });
                }
            }
        }, 1000);
    }

    if (action === "PAUSE") {
        paused = true;
        self.postMessage({ type: "PAUSED", timeLeft: remaining });
    }

    if (action === "RESUME") {
        paused = false;
        endTime = Date.now() + remaining * 1000;
        self.postMessage({ type: "RESUMED", timeLeft: remaining });
    }

    if (action === "STOP") {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        self.postMessage({ type: "STOPPED" });
    }
};
