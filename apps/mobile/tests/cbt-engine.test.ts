import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeRemaining, calculateRemainingSeconds } from '../src/lib/cbt-timer';

describe('CBT Timer Engine', () => {
  it('formats remaining seconds properly as MM:SS and HH:MM:SS', () => {
    assert.equal(formatTimeRemaining(0), '00:00');
    assert.equal(formatTimeRemaining(45), '00:45');
    assert.equal(formatTimeRemaining(60), '01:00');
    assert.equal(formatTimeRemaining(3599), '59:59');
    assert.equal(formatTimeRemaining(3600), '01:00:00');
    assert.equal(formatTimeRemaining(7325), '02:02:05');
  });

  it('calculates remaining seconds against targetEndTimestamp accurately', () => {
    const now = 1700000000000;
    const target = now + 120 * 1000; // 120 seconds in future
    assert.equal(calculateRemainingSeconds(target, now), 120);

    const pastTarget = now - 5000;
    assert.equal(calculateRemainingSeconds(pastTarget, now), 0); // clamped to 0
  });

  it('handles negative or zero time without crashing', () => {
    assert.equal(formatTimeRemaining(-10), '00:00');
  });
});

describe('CBT Offline Queue Sequencing', () => {
  it('increments sequence numbers monotonically per queued answer', () => {
    let sequence = 0;
    const queue: Array<{ seq: number; questionId: string; optionId: string | null }> = [];

    const enqueue = (questionId: string, optionId: string | null) => {
      sequence++;
      queue.push({ seq: sequence, questionId, optionId });
    };

    enqueue('q1', 'opt_a');
    enqueue('q2', 'opt_b');
    enqueue('q1', 'opt_c'); // changed answer for q1

    assert.equal(queue.length, 3);
    assert.equal(queue[0].seq, 1);
    assert.equal(queue[1].seq, 2);
    assert.equal(queue[2].seq, 3);
    assert.equal(queue[2].optionId, 'opt_c');
  });

  it('flushes in strict sequence order ensuring latest answer wins', () => {
    const rawEvents = [
      { seq: 1, questionId: 'q1', optionId: 'opt_a' },
      { seq: 2, questionId: 'q2', optionId: 'opt_b' },
      { seq: 3, questionId: 'q1', optionId: 'opt_c' },
      { seq: 4, questionId: 'q1', optionId: null }, // cleared
    ];

    // Deduplicate maintaining latest state
    const finalAnswers: Record<string, string | null> = {};
    rawEvents.sort((a, b) => a.seq - b.seq).forEach((ev) => {
      finalAnswers[ev.questionId] = ev.optionId;
    });

    assert.equal(finalAnswers['q1'], null);
    assert.equal(finalAnswers['q2'], 'opt_b');
  });
});

describe('Single-flight Refresh Token Mutex Logic', () => {
  it('prevents multiple concurrent refresh calls from executing simultaneously', async () => {
    let refreshCallCount = 0;
    let refreshPromise: Promise<string> | null = null;

    const performRefresh = async () => {
      if (refreshPromise) return refreshPromise;

      refreshPromise = (async () => {
        refreshCallCount++;
        // Simulate async refresh
        await new Promise((r) => setTimeout(r, 20));
        return 'new_access_token';
      })().finally(() => {
        refreshPromise = null;
      });

      return refreshPromise;
    };

    // Fire 5 concurrent requests
    const results = await Promise.all([
      performRefresh(),
      performRefresh(),
      performRefresh(),
      performRefresh(),
      performRefresh(),
    ]);

    // All should get the same token and only 1 refresh call should happen
    assert.equal(refreshCallCount, 1);
    results.forEach((token) => assert.equal(token, 'new_access_token'));
  });
});
