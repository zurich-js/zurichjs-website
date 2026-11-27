#!/usr/bin/env node
// CI timings from GitHub Actions history, to check whether a CI change made runs faster.
//
//   node tools/ci/metrics.mjs --split <sha> [--event pull_request|push] [--all] [--runs 150] [--flaky]
//
// Reads the CI workflow's runs with `gh api` (so `gh auth login` first). It keeps one event (pull_request
// by default), and only successful runs unless --all, and splits them into the runs that ran without and
// with commit <sha>: a run has it when its own commit contains it, or when it is a pull request into main
// created after <sha> was committed (it ran on the merge with main). A stacked PR whose branch lacks <sha>
// ran without it, since its parent branch may not have it yet. For each side it prints the run's wall time (created until its last job
// finished, queueing included), each job's time and the slowest steps, as p50 and p95. --flaky also counts
// tests that failed and passed on retry, from the e2e job logs, since the step itself reports success.
// Compare the same event and outcome on both sides, with at least 10 runs each.
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const REPO = 'zurich-js/zurichjs-website';
const { values: args } = parseArgs({
  options: {
    split: { type: 'string' },
    event: { type: 'string', default: 'pull_request' },
    all: { type: 'boolean', default: false },
    runs: { type: 'string', default: '150' },
    flaky: { type: 'boolean', default: false },
  },
});

const gh = (path) => JSON.parse(execFileSync('gh', ['api', path], { maxBuffer: 1 << 28 }).toString());
// Job logs carry colour codes, which gh refuses to print unless allowed. Playwright colours "N flaky" as one run.
const ghLog = (path) => execFileSync('gh', ['api', '--allow-escape-sequences', path], { maxBuffer: 1 << 28 }).toString();
const seconds = (from, to) => (new Date(to).getTime() - new Date(from).getTime()) / 1000;
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : NaN;
};
const stats = (values) =>
  `n ${String(values.length).padStart(3)}  p50 ${String(Math.round(quantile(values, 0.5))).padStart(4)} s  p95 ${String(Math.round(quantile(values, 0.95))).padStart(4)} s`;

const splitAt = args.split ? execFileSync('git', ['show', '-s', '--format=%cI', args.split]).toString().trim() : undefined;

const contains = (sha) => ['ahead', 'identical'].includes(gh(`repos/${REPO}/compare/${args.split}...${sha}`).status);
const includesSplit = (run) =>
  contains(run.head_sha) || (run.event === 'pull_request' && run.pull_requests.some((pr) => pr.base.ref === 'main') && new Date(run.created_at) > new Date(splitAt));

const runs = [];
for (let page = 1; runs.length < Number(args.runs); page++) {
  const batch = gh(`repos/${REPO}/actions/workflows/ci.yml/runs?event=${args.event}&status=completed&per_page=100&page=${page}`).workflow_runs;
  if (!batch.length) break;
  runs.push(...batch.filter((run) => args.all || run.conclusion === 'success'));
}

const groups = new Map();
for (const run of runs.slice(0, Number(args.runs))) {
  const side = !splitAt ? 'all' : includesSplit(run) ? 'after' : 'before';
  const jobs = gh(`repos/${REPO}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`).jobs.filter((job) => job.started_at && job.completed_at);
  if (!jobs.length) continue;
  const group = groups.get(side) ?? { wall: [], jobs: new Map(), steps: new Map(), flaky: 0, flakyRuns: 0 };
  groups.set(side, group);
  group.wall.push(
    seconds(
      run.created_at,
      jobs
        .map((job) => job.completed_at)
        .sort()
        .at(-1),
    ),
  );
  let flakyHere = 0;
  for (const job of jobs) {
    group.jobs.set(job.name, [...(group.jobs.get(job.name) ?? []), seconds(job.started_at, job.completed_at)]);
    for (const step of job.steps ?? []) {
      if (!step.started_at || !step.completed_at || step.conclusion === 'skipped') continue;
      const key = `${job.name} › ${step.name}`;
      group.steps.set(key, [...(group.steps.get(key) ?? []), seconds(step.started_at, step.completed_at)]);
    }
    if (args.flaky && /e2e/i.test(job.name)) {
      const match = ghLog(`repos/${REPO}/actions/jobs/${job.id}/logs`).match(/(\d+) flaky/);
      flakyHere += match ? Number(match[1]) : 0;
    }
  }
  group.flaky += flakyHere;
  group.flakyRuns += flakyHere ? 1 : 0;
}

console.log(`CI ${args.event} runs, ${args.all ? 'every outcome' : 'successful only'}${splitAt ? `, split at ${args.split} (${splitAt})` : ''}`);
for (const side of ['before', 'after', 'all']) {
  const group = groups.get(side);
  if (!group) continue;
  console.log(`\n${side}\n  wall time${' '.repeat(42)}${stats(group.wall)}`);
  for (const [name, values] of [...group.jobs].sort()) console.log(`  ${name.slice(0, 49).padEnd(51)}${stats(values)}`);
  console.log('  slowest steps');
  const slowest = [...group.steps].sort((a, b) => quantile(b[1], 0.5) - quantile(a[1], 0.5)).slice(0, 10);
  for (const [name, values] of slowest) console.log(`    ${name.slice(0, 62).padEnd(64)}${stats(values)}`);
  if (args.flaky) console.log(`  flaky tests: ${group.flaky} in ${group.flakyRuns} of ${group.wall.length} runs`);
}
