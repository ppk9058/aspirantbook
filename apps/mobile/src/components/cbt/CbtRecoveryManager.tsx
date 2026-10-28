import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { cbtSyncQueue } from "../../lib/cbt-sync";

export interface CbtRecoveryManagerProps {
  onRecoveryComplete?: (recoveredCount: number) => void;
  onRecoveryError?: (error: string) => void;
}

/**
 * CbtRecoveryManager
 * Manages CBT offline answer queue synchronization across application lifecycle:
 * 1. Defers recovery until auth state resolves from storage and viewer is verified.
 * 2. Triggers recoverUnsentAnswers() immediately when authentication becomes ready.
 * 3. Triggers recoverUnsentAnswers() whenever app transitions from background to active (foreground).
 * 4. Eliminates silent catches by surfacing any network or server failures to queue state.
 */
export function CbtRecoveryManager({
  onRecoveryComplete,
  onRecoveryError,
}: CbtRecoveryManagerProps = {}) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasRecoveredOnAuth = useRef(false);

  // 1. Initial authenticated launch recovery
  useEffect(() => {
    if (isLoading) {
      // Defer recovery: do not attempt recovery before auth tokens are loaded from Storage
      return;
    }

    if (isAuthenticated && !hasRecoveredOnAuth.current) {
      hasRecoveredOnAuth.current = true;
      (async () => {
        try {
          const recovered = await cbtSyncQueue.recoverUnsentAnswers();
          if (cbtSyncQueue.lastSyncError) {
            onRecoveryError?.(cbtSyncQueue.lastSyncError);
          } else {
            onRecoveryComplete?.(recovered);
          }
        } catch (err: any) {
          const errMsg = err?.message || "CBT answer recovery failed";
          cbtSyncQueue.lastSyncError = errMsg;
          onRecoveryError?.(errMsg);
        }
      })();
    } else if (!isAuthenticated) {
      hasRecoveredOnAuth.current = false;
    }
  }, [isAuthenticated, isLoading, onRecoveryComplete, onRecoveryError]);

  // 2. Resume / AppState transition to active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated && !isLoading) {
        void (async () => {
          try {
            const recovered = await cbtSyncQueue.recoverUnsentAnswers();
            if (cbtSyncQueue.lastSyncError) {
              onRecoveryError?.(cbtSyncQueue.lastSyncError);
            } else {
              onRecoveryComplete?.(recovered);
            }
          } catch (err: any) {
            const errMsg = err?.message || "CBT answer recovery failed on resume";
            cbtSyncQueue.lastSyncError = errMsg;
            onRecoveryError?.(errMsg);
          }
        })();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isLoading, onRecoveryComplete, onRecoveryError]);

  return null;
}
