import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const jobCompletion = new Trend('pdf_completion_ms', true);
const jobErrors     = new Rate('pdf_job_errors');
const jobsEnqueued  = new Counter('pdf_jobs_enqueued');
const jobTimeouts   = new Counter('pdf_job_timeouts');

const BASE_URL       = __ENV.BASE_URL || 'http://localhost:3000';
const ROW_COUNT      = 10_000;
const JOB_TIMEOUT_MS = 60_000;
const POLL_INTERVAL  = 1.5;

export const options = {
  scenarios: {
    concurrency_ladder: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5  },
        { duration: '1m', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed:     ['rate<0.01'],
    pdf_job_errors:      ['rate<0.10'],          // 10% — fila pode saturar em pico
    pdf_completion_ms:   ['p(95)<60000'],        // p95 < 60s fim-a-fim
  },
};

const TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; padding: 2rem; font-size: 11px; }
  h1 { font-size: 1.4rem; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
  th { background: #f0f0f0; }
  tfoot td { font-weight: bold; }
</style>
</head>
<body>
  <h1>{{title}}</h1>
  <p>Gerado em: {{date generatedAt "dd/MM/yyyy HH:mm:ss"}}</p>
  <p>Total de registros: {{length rows}}</p>
  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th>Valor</th><th>Categoria</th><th>Descrição</th></tr>
    </thead>
    <tbody>
      {{#each rows}}
      <tr>
        <td>{{add @index 1}}</td>
        <td>{{name}}</td>
        <td>{{currency value}}</td>
        <td>{{category}}</td>
        <td>{{description}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr><td colspan="2">Total</td><td>{{currency total}}</td><td colspan="2"></td></tr>
    </tfoot>
  </table>
</body>
</html>`;

function buildParams() {
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => ({
    name:        `Produto ${i + 1}`,
    value:       Math.round((Math.random() * 9900 + 100) * 100) / 100,
    category:    ['Vendas', 'Serviços', 'Licenças', 'Suporte'][i % 4],
    description: `Descrição detalhada do item número ${i + 1} para fins de teste de carga`,
  }));
  return {
    title:       `Relatório Concorrência — ${ROW_COUNT} registros`,
    generatedAt: new Date().toISOString(),
    rows,
    total:       rows.reduce((s, r) => s + r.value, 0),
  };
}

const PAYLOAD = JSON.stringify({ template: TEMPLATE, parameters: buildParams() });

export default function () {
  // 1. Enqueue
  const enqueueRes = http.post(
    `${BASE_URL}/reports/generate`,
    PAYLOAD,
    { headers: { 'Content-Type': 'application/json' } },
  );

  const enqueueOk = check(enqueueRes, {
    'enqueue 2xx': (r) => r.status === 200 || r.status === 201,
    'has jobId':   (r) => { try { return !!JSON.parse(r.body).jobId; } catch { return false; } },
  });

  if (!enqueueOk) {
    console.error(`enqueue failed vu=${__VU}: ${enqueueRes.status} ${enqueueRes.body}`);
    jobErrors.add(1);
    sleep(1);
    return;
  }

  jobsEnqueued.add(1);
  const { jobId } = JSON.parse(enqueueRes.body);
  const startMs   = Date.now();

  // 2. Poll until done or timeout
  let done = false;
  while (!done && (Date.now() - startMs) < JOB_TIMEOUT_MS) {
    sleep(POLL_INTERVAL);

    const pollRes = http.get(`${BASE_URL}/reports/job/${jobId}/status`);
    check(pollRes, { 'poll 200': (r) => r.status === 200 });

    let body;
    try { body = JSON.parse(pollRes.body); } catch { continue; }

    if (body.state === 'completed') {
      const elapsed = Date.now() - startMs;
      jobCompletion.add(elapsed, { vus: String(__VU) });
      jobErrors.add(0);
      done = true;
    } else if (body.state === 'failed') {
      console.error(`job failed vu=${__VU} jobId=${jobId}: ${body.reason}`);
      jobErrors.add(1);
      done = true;
    }
  }

  if (!done) {
    console.warn(`job TIMEOUT vu=${__VU} after ${JOB_TIMEOUT_MS}ms jobId=${jobId}`);
    jobErrors.add(1);
    jobTimeouts.add(1);
  }
}
