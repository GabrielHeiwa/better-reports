import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const jobCompletionTime = new Trend('pdf_job_completion_ms', true);
const jobErrorRate = new Rate('pdf_job_errors');
const jobsEnqueued = new Counter('pdf_jobs_enqueued');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 1500;
const JOB_TIMEOUT_MS = 60_000;

export const options = {
  scenarios: {
    // Ramp-up: gradual increase to find breaking point
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],           // <1% HTTP errors
    http_req_duration: ['p(95)<500'],         // enqueue p95 < 500ms
    pdf_job_completion_ms: ['p(95)<30000'],   // job done p95 < 30s
    pdf_job_errors: ['rate<0.05'],            // <5% job failures
  },
};

const SAMPLE_TEMPLATE = `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: sans-serif; padding: 2rem; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #ddd; padding: 8px; }
</style></head>
<body>
  <h1>{{title}}</h1>
  <p>Generated at: {{date generatedAt "dd/MM/yyyy HH:mm"}}</p>
  <table>
    <tr><th>Item</th><th>Value</th></tr>
    {{#each rows}}
    <tr><td>{{name}}</td><td>{{currency value}}</td></tr>
    {{/each}}
  </table>
  <p><strong>Total: {{currency total}}</strong></p>
</body>
</html>`;

const SAMPLE_PARAMS = {
  title: 'Performance Test Report',
  generatedAt: new Date().toISOString(),
  rows: [
    { name: 'Item A', value: 1234.56 },
    { name: 'Item B', value: 789.00 },
    { name: 'Item C', value: 456.78 },
  ],
  total: 2480.34,
};

export default function () {
  // 1. Enqueue job
  const enqueueRes = http.post(
    `${BASE_URL}/reports/generate`,
    JSON.stringify({ template: SAMPLE_TEMPLATE, parameters: SAMPLE_PARAMS }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const enqueueOk = check(enqueueRes, {
    'enqueue status 201': (r) => r.status === 201 || r.status === 200,
    'has jobId': (r) => {
      try { return !!JSON.parse(r.body).jobId; } catch { return false; }
    },
  });

  if (!enqueueOk) {
    jobErrorRate.add(1);
    sleep(1);
    return;
  }

  jobsEnqueued.add(1);
  const { jobId } = JSON.parse(enqueueRes.body);
  const startMs = Date.now();

  // 2. Poll until done or timeout
  let done = false;
  while (!done && Date.now() - startMs < JOB_TIMEOUT_MS) {
    sleep(POLL_INTERVAL_MS / 1000);

    const pollRes = http.get(`${BASE_URL}/reports/job/${jobId}/status`);

    const pollOk = check(pollRes, {
      'poll status 200': (r) => r.status === 200,
    });

    if (!pollOk) continue;

    let body;
    try { body = JSON.parse(pollRes.body); } catch { continue; }

    if (body.state === 'completed') {
      jobCompletionTime.add(Date.now() - startMs);
      jobErrorRate.add(0);
      done = true;
    } else if (body.state === 'failed') {
      jobErrorRate.add(1);
      done = true;
    }
  }

  if (!done) {
    jobErrorRate.add(1);
  }
}
