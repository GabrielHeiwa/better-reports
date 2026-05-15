import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const jobCompletion = new Trend('pdf_completion_ms', true);
const jobErrors     = new Rate('pdf_job_errors');
const jobsEnqueued  = new Counter('pdf_jobs_enqueued');

const BASE_URL      = __ENV.BASE_URL || 'http://localhost:3000';
const JOB_TIMEOUT_MS = 60_000;
const POLL_INTERVAL  = 1.5; // seconds

const LEVELS = [100, 500, 1000, 2000, 5000, 10000];
const REPS   = 3;
// total iterations = LEVELS.length * REPS = 18

export const options = {
  scenarios: {
    weight_ladder: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: LEVELS.length * REPS,
      maxDuration: '30m',
    },
  },
  thresholds: {
    http_req_failed:  ['rate<0.01'],
    pdf_job_errors:   ['rate<0.05'],
  },
};

function buildTemplate(rows) {
  const rowsHtml = Array.from({ length: rows }, (_, i) => `
    <tr>
      <td>Item ${i + 1}</td>
      <td>{{currency (lookup ../rows ${i} "value")}}</td>
      <td>{{lookup ../rows ${i} "category"}}</td>
      <td>{{lookup ../rows ${i} "description"}}</td>
    </tr>`).join('');

  // Use {{#each rows}} — simpler and more realistic
  return `<!DOCTYPE html>
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
}

function buildParams(rowCount) {
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    name:        `Produto ${i + 1}`,
    value:       Math.round((Math.random() * 9900 + 100) * 100) / 100,
    category:    ['Vendas', 'Serviços', 'Licenças', 'Suporte'][i % 4],
    description: `Descrição detalhada do item número ${i + 1} para fins de teste de carga`,
  }));

  return {
    title:       `Relatório de Performance — ${rowCount} registros`,
    generatedAt: new Date().toISOString(),
    rows,
    total:       rows.reduce((s, r) => s + r.value, 0),
  };
}

export default function () {
  const levelIndex = Math.floor(__ITER / REPS);
  const rep        = (__ITER % REPS) + 1;
  const rowCount   = LEVELS[levelIndex];

  console.log(`[iter ${__ITER}] rows=${rowCount} rep=${rep}/${REPS}`);

  const payload = JSON.stringify({
    template:   buildTemplate(rowCount),
    parameters: buildParams(rowCount),
  });

  // 1. Enqueue
  const enqueueRes = http.post(
    `${BASE_URL}/reports/generate`,
    payload,
    { headers: { 'Content-Type': 'application/json' } },
  );

  const enqueueOk = check(enqueueRes, {
    [`[${rowCount}r] enqueue 201`]: (r) => r.status === 201 || r.status === 200,
    [`[${rowCount}r] has jobId`]:   (r) => { try { return !!JSON.parse(r.body).jobId; } catch { return false; } },
  });

  if (!enqueueOk) {
    console.error(`[rows=${rowCount}] enqueue failed: ${enqueueRes.status} ${enqueueRes.body}`);
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
      jobCompletion.add(elapsed, { rows: String(rowCount) });
      jobErrors.add(0);
      console.log(`[rows=${rowCount}] rep=${rep} done in ${elapsed}ms`);
      done = true;
    } else if (body.state === 'failed') {
      console.error(`[rows=${rowCount}] rep=${rep} FAILED: ${body.reason}`);
      jobErrors.add(1);
      done = true;
    }
  }

  if (!done) {
    console.error(`[rows=${rowCount}] rep=${rep} TIMEOUT after ${JOB_TIMEOUT_MS}ms`);
    jobErrors.add(1);
  }
}
