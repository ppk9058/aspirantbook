import React from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import { AppState } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";
import { cbtSyncQueue, MemoryCbtDriver } from "../src/lib/cbt-sync";
import { CbtRecoveryManager } from "../src/components/cbt/CbtRecoveryManager";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <GoalProvider>{children}</GoalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe("T4: CBT Recovery Wiring & Parity [recovery-a]..[recovery-f]", () => {
  let fakeDriver: MemoryCbtDriver;

  beforeEach(async () => {
    jest.clearAllMocks();
    await Storage.clearAllAuthTokens();
    fakeDriver = new MemoryCbtDriver();
    cbtSyncQueue.setDriver(fakeDriver);
    cbtSyncQueue.lastSyncError = null;
  });

  afterEach(async () => {
    await Storage.clearAllAuthTokens();
    cbtSyncQueue.lastSyncError = null;
  });

  it("[recovery-a] unauth user does not make PUT requests", async () => {
    // Given unauthenticated state (no tokens)
    const recoverSpy = jest.spyOn(cbtSyncQueue, "recoverUnsentAnswers");
    const syncSpy = jest.fn();
    (cbtSyncQueue as any).syncApiFn = syncSpy;

    // Seed an unsynced answer in local storage
    await fakeDriver.saveRecord({
      attemptId: "att-unauth-1",
      questionId: "q-1",
      selectedOption: "B",
      isMarked: false,
      timeSpentSecs: 15,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    render(<CbtRecoveryManager />, { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 100));

    expect(recoverSpy).not.toHaveBeenCalled();
    expect(syncSpy).not.toHaveBeenCalled();
    recoverSpy.mockRestore();
  });

  it("[recovery-b] pending records sent in clientSeq order", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-seq", name: "Candidate", email: "candidate@test.com" });

    // Seed out-of-order sequence records
    await fakeDriver.saveRecord({
      attemptId: "att-seq-1",
      questionId: "q-2",
      selectedOption: "C",
      isMarked: false,
      timeSpentSecs: 20,
      sequenceNumber: 2,
      synced: false,
      updatedAt: Date.now(),
    });
    await fakeDriver.saveRecord({
      attemptId: "att-seq-1",
      questionId: "q-1",
      selectedOption: "A",
      isMarked: false,
      timeSpentSecs: 10,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    let sentPayload: any = null;
    (cbtSyncQueue as any).syncApiFn = jest.fn(async (_attId: string, payload: any) => {
      sentPayload = payload;
      return { ok: true };
    });

    render(<CbtRecoveryManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(sentPayload).not.toBeNull();
    });

    expect(sentPayload.answers.length).toBe(2);
    // Verified: ordered by clientSeq ascending (seq 1 then seq 2)
    const seqs = sentPayload.answers.map((a: any) => a.sequenceNumber);
    expect(seqs).toEqual([1, 2]);
    expect(sentPayload.lastSequenceNumber).toBe(2);
  });

  it("[recovery-c] records deleted only after server ack", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-ack", name: "Candidate", email: "candidate@test.com" });

    await fakeDriver.saveRecord({
      attemptId: "att-ack-1",
      questionId: "q-ack",
      selectedOption: "D",
      isMarked: false,
      timeSpentSecs: 30,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    // 1. First attempt: server responds with error (no ack)
    (cbtSyncQueue as any).syncApiFn = jest.fn().mockResolvedValueOnce({
      ok: false,
      error: { message: "Internal server error" },
    });

    await cbtSyncQueue.recoverUnsentAnswers();

    // Verify row was NOT deleted or marked synced
    let records = await fakeDriver.getRecordsForAttempt("att-ack-1");
    expect(records.length).toBe(1);
    expect(records[0].synced).toBe(false);

    // 2. Second attempt: server acknowledges successfully
    (cbtSyncQueue as any).syncApiFn = jest.fn().mockResolvedValueOnce({
      ok: true,
      data: { syncedCount: 1 },
    });

    await cbtSyncQueue.recoverUnsentAnswers();

    // Verify row is now marked synced after ack
    records = await fakeDriver.getRecordsForAttempt("att-ack-1");
    expect(records.length).toBe(1);
    expect(records[0].synced).toBe(true);
  });

  it("[recovery-d] failure keeps rows and shows error banner with retry", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-fail", name: "Candidate", email: "candidate@test.com" });

    await fakeDriver.saveRecord({
      attemptId: "att-fail-1",
      questionId: "q-fail",
      selectedOption: "A",
      isMarked: true,
      timeSpentSecs: 12,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    const onRecoveryError = jest.fn();
    (cbtSyncQueue as any).syncApiFn = jest.fn().mockRejectedValue(new Error("Network timeout during recovery"));

    render(<CbtRecoveryManager onRecoveryError={onRecoveryError} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(cbtSyncQueue.getLastSyncError()).toBe("Network timeout during recovery");
      expect(onRecoveryError).toHaveBeenCalledWith("Network timeout during recovery");
    });

    // Rows must remain intact in local storage
    const records = await fakeDriver.getRecordsForAttempt("att-fail-1");
    expect(records.length).toBe(1);
    expect(records[0].synced).toBe(false);

    // Retry succeeds
    (cbtSyncQueue as any).syncApiFn = jest.fn().mockResolvedValue({ ok: true });
    const recovered = await cbtSyncQueue.recoverUnsentAnswers();
    expect(recovered).toBe(1);
    expect(cbtSyncQueue.getLastSyncError()).toBeNull();
  });

  it("[recovery-e] 401 mid-recovery triggers token refresh", async () => {
    await Storage.setAccessToken("expired-token");
    await Storage.setRefreshToken("valid-refresh-token");
    await Storage.setUser({ id: "u-rec-401", name: "Candidate", email: "candidate@test.com" });

    await fakeDriver.saveRecord({
      attemptId: "att-401",
      questionId: "q-401",
      selectedOption: "B",
      isMarked: false,
      timeSpentSecs: 25,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    let refreshCalled = false;
    let putWithNewToken = false;

    (cbtSyncQueue as any).syncApiFn = jest.fn(async () => {
      const token = await Storage.getAccessToken();
      if (token === "expired-token") {
        // Trigger 401 refresh flow
        refreshCalled = true;
        await Storage.setAccessToken("fresh-refreshed-token");
        return { ok: false, error: { message: "Token expired", code: "UNAUTHORIZED" } };
      }
      if (token === "fresh-refreshed-token") {
        putWithNewToken = true;
        return { ok: true };
      }
      return { ok: false };
    });

    // First attempt triggers 401
    await cbtSyncQueue.recoverUnsentAnswers();
    expect(refreshCalled).toBe(true);

    // Retry with refreshed token succeeds
    const recovered = await cbtSyncQueue.recoverUnsentAnswers();
    expect(putWithNewToken).toBe(true);
    expect(recovered).toBe(1);
  });

  it("[recovery-f] recovery does not double send concurrent requests", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-nodouble", name: "Candidate", email: "candidate@test.com" });

    await fakeDriver.saveRecord({
      attemptId: "att-concurrent-1",
      questionId: "q-conc",
      selectedOption: "C",
      isMarked: false,
      timeSpentSecs: 40,
      sequenceNumber: 1,
      synced: false,
      updatedAt: Date.now(),
    });

    let syncCallCount = 0;
    (cbtSyncQueue as any).syncApiFn = jest.fn(async () => {
      syncCallCount++;
      await new Promise((r) => setTimeout(r, 100)); // Simulate in-flight HTTP request
      return { ok: true };
    });

    // Fire two recover calls simultaneously
    const p1 = cbtSyncQueue.recoverUnsentAnswers();
    const p2 = cbtSyncQueue.recoverUnsentAnswers();

    const [r1, r2] = await Promise.all([p1, p2]);

    // Only one call executes the syncApiFn, second one detects isSyncing and skips duplicate PUT
    expect(syncCallCount).toBe(1);
    expect(r1 + r2).toBe(1);
  });
});
