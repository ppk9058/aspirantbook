import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    exam_takers_300: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 300 }, // Thundering herd start
        { duration: '30s', target: 300 }, // Steady exam sync & think time
        { duration: '10s', target: 0 },   // Submit & conclude
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3045';
const TEST_ID = __ENV.TEST_ID || 'et_perf_100q';

export default function () {
  const vuId = __VU;
  const iteration = __ITER;
  const userEmail = `student_loadtest_${vuId}@trillionskill.test`;

  // 1. Exam Start Request
  const startPayload = JSON.stringify({
    testId: TEST_ID,
    language: 'English',
    retake: false,
  });

  const startRes = http.post(`${BASE_URL}/api/exam/attempt/start`, startPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'ExamStart' },
  });

  check(startRes, {
    'start status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  let attemptId = null;
  try {
    const json = startRes.json();
    attemptId = json?.data?.attemptId;
  } catch (e) {}

  if (!attemptId) {
    sleep(1);
    return;
  }

  // 2. Realistic Think Time & Answer Sync Loops (3-5 answers per sync)
  for (let step = 1; step <= 3; step++) {
    // Realistic think time between questions
    sleep(1 + Math.random() * 2);

    const syncPayload = JSON.stringify({
      answers: [
        {
          questionId: `q_load_${step}`,
          selectedOption: ['A', 'B', 'C', 'D'][step % 4],
          isMarked: step % 2 === 0,
          timeSpentSecs: 30,
        },
      ],
      sequence: step,
      tabSwitchCount: 0,
    });

    const syncRes = http.post(
      `${BASE_URL}/api/exam/attempt/${attemptId}/sync`,
      syncPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'AnswerSync' },
      }
    );

    check(syncRes, {
      'sync status is 200': (r) => r.status === 200,
    });
  }

  // 3. Deadline / Final Submit Herd
  sleep(1);
  const submitPayload = JSON.stringify({
    answers: [],
  });

  const submitRes = http.post(
    `${BASE_URL}/api/exam/attempt/${attemptId}/submit`,
    submitPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'ExamSubmit' },
    }
  );

  check(submitRes, {
    'submit status is 200': (r) => r.status === 200,
  });

  // 4. Result & Leaderboard View
  sleep(0.5);
  const resultRes = http.get(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, {
    tags: { name: 'ExamResult' },
  });
  check(resultRes, {
    'result status is 200': (r) => r.status === 200,
  });

  const lbRes = http.get(`${BASE_URL}/api/exam/${TEST_ID}/leaderboard`, {
    tags: { name: 'ExamLeaderboard' },
  });
  check(lbRes, {
    'leaderboard status is 200': (r) => r.status === 200,
  });
}
