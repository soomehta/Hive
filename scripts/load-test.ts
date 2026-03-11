/**
 * Load test script for critical Hive endpoints.
 *
 * Usage:
 *   npm run test:load
 *   npm run test:load -- --concurrency 20 --duration 60
 *
 * Environment variables:
 *   BASE_URL        - Server URL (default: http://localhost:3000)
 *   AUTH_TOKEN       - Bearer token for authenticated endpoints
 *   ORG_ID           - Organization ID header value
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "";
const ORG_ID = process.env.ORG_ID ?? "";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  let concurrency = 10;
  let duration = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--concurrency" && args[i + 1]) concurrency = Number(args[++i]);
    if (args[i] === "--duration" && args[i + 1]) duration = Number(args[++i]);
  }
  return { concurrency, duration };
}

// ---------------------------------------------------------------------------
// Stats collector
// ---------------------------------------------------------------------------
interface EndpointStats {
  name: string;
  latencies: number[];
  errors: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function printReport(stats: EndpointStats[], durationSec: number) {
  console.log("\n" + "=".repeat(80));
  console.log("LOAD TEST RESULTS");
  console.log("=".repeat(80));

  for (const s of stats) {
    const sorted = [...s.latencies].sort((a, b) => a - b);
    const total = s.latencies.length + s.errors;
    const errorRate = total > 0 ? ((s.errors / total) * 100).toFixed(1) : "0.0";
    const throughput = (total / durationSec).toFixed(1);

    console.log(`\n  ${s.name}`);
    console.log(`  ${"─".repeat(50)}`);
    console.log(`  Requests:    ${total} (${s.errors} errors, ${errorRate}% error rate)`);
    console.log(`  Throughput:  ${throughput} req/s`);

    if (sorted.length > 0) {
      console.log(`  p50:         ${percentile(sorted, 50).toFixed(0)} ms`);
      console.log(`  p95:         ${percentile(sorted, 95).toFixed(0)} ms`);
      console.log(`  p99:         ${percentile(sorted, 99).toFixed(0)} ms`);
      console.log(`  min/max:     ${sorted[0].toFixed(0)} / ${sorted[sorted.length - 1].toFixed(0)} ms`);
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

// ---------------------------------------------------------------------------
// Request runner
// ---------------------------------------------------------------------------
async function timedFetch(
  url: string,
  init: RequestInit,
  stats: EndpointStats,
): Promise<void> {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const elapsed = performance.now() - start;
    // Consume body to free resources
    await res.text();
    if (res.ok) {
      stats.latencies.push(elapsed);
    } else {
      stats.errors++;
    }
  } catch {
    stats.errors++;
  }
}

interface Endpoint {
  name: string;
  method: string;
  path: string;
  body?: string;
  contentType?: string;
}

async function runLoadTest(
  endpoints: Endpoint[],
  concurrency: number,
  durationSec: number,
) {
  const allStats: EndpointStats[] = endpoints.map((e) => ({
    name: `${e.method} ${e.path}`,
    latencies: [],
    errors: 0,
  }));

  const headers: Record<string, string> = {};
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  if (ORG_ID) headers["x-org-id"] = ORG_ID;

  const endTime = Date.now() + durationSec * 1000;

  console.log(`\nStarting load test against ${BASE_URL}`);
  console.log(`  Concurrency: ${concurrency}`);
  console.log(`  Duration:    ${durationSec}s`);
  console.log(`  Endpoints:   ${endpoints.length}`);
  if (!AUTH_TOKEN) console.log("  ⚠  No AUTH_TOKEN set — authenticated endpoints will return errors");
  console.log("");

  // Each worker loops until time expires
  async function worker() {
    while (Date.now() < endTime) {
      for (let i = 0; i < endpoints.length; i++) {
        if (Date.now() >= endTime) break;
        const ep = endpoints[i];
        const init: RequestInit = {
          method: ep.method,
          headers: {
            ...headers,
            ...(ep.contentType ? { "Content-Type": ep.contentType } : {}),
          },
          ...(ep.body ? { body: ep.body } : {}),
        };
        await timedFetch(`${BASE_URL}${ep.path}`, init, allStats[i]);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  printReport(allStats, durationSec);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const { concurrency, duration } = parseArgs();

// Determine which test suite to run via --suite flag
function parseSuite(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--suite" && args[i + 1]) return args[++i];
  }
  return "core";
}

const CHANNEL_ID = process.env.CHANNEL_ID ?? "00000000-0000-0000-0000-000000000001";

const suites: Record<string, Endpoint[]> = {
  core: [
    { name: "Health", method: "GET", path: "/api/health" },
    { name: "Tasks", method: "GET", path: "/api/tasks" },
    {
      name: "PA Chat",
      method: "POST",
      path: "/api/pa/chat",
      contentType: "application/json",
      body: JSON.stringify({ message: "What are my tasks for today?" }),
    },
  ],

  // Phase 6: Chat burst test — message throughput
  chat_burst: [
    {
      name: "Post Chat Message",
      method: "POST",
      path: `/api/chat/channels/${CHANNEL_ID}/messages`,
      contentType: "application/json",
      body: JSON.stringify({ content: `Load test message ${Date.now()}` }),
    },
    {
      name: "Get Chat Messages",
      method: "GET",
      path: `/api/chat/channels/${CHANNEL_ID}/messages`,
    },
    {
      name: "Search Messages",
      method: "GET",
      path: "/api/chat/messages/search?query=test",
    },
  ],

  // Phase 6: Editor autosave soak test
  editor_autosave: [
    {
      name: "Page Autosave (PATCH)",
      method: "PATCH",
      path: "/api/pages/00000000-0000-0000-0000-000000000001",
      contentType: "application/json",
      body: JSON.stringify({
        contentJson: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: `Autosave test ${Date.now()}` }] },
          ],
        },
        plainText: `Autosave test ${Date.now()}`,
      }),
    },
    {
      name: "Get Pages",
      method: "GET",
      path: "/api/pages",
    },
  ],

  // Phase 6: Pinboard home-data aggregation response time
  pinboard_home: [
    {
      name: "Pinboard Home Data",
      method: "GET",
      path: "/api/pinboard/home-data",
    },
    {
      name: "Pinboard Layouts",
      method: "GET",
      path: "/api/pinboard/layouts",
    },
    {
      name: "Notices List",
      method: "GET",
      path: "/api/notices",
    },
    {
      name: "Channels List",
      method: "GET",
      path: "/api/chat/channels",
    },
  ],
};

const suite = parseSuite();
const endpoints = suites[suite];
if (!endpoints) {
  console.error(`Unknown suite: "${suite}". Available: ${Object.keys(suites).join(", ")}`);
  process.exit(1);
}

console.log(`Suite: ${suite}`);
runLoadTest(endpoints, concurrency, duration);
