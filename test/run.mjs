/* Runs every test against a freshly served copy of the app and reports one line
   each. The server is started here so the whole suite is a single command; the
   app has no build step, so serving the directory is all there is to do. */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = process.env.PORT || 8899;
const ROOT = new URL('..', import.meta.url).pathname;
const only = process.argv.slice(2);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
  { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => server.kill());
await sleep(700);

const tests = readdirSync(new URL('.', import.meta.url))
  .filter(f => f.endsWith('.mjs') && !['run.mjs', 'verdict.mjs'].includes(f))
  .filter(f => !only.length || only.some(o => f.includes(o)))
  .sort();

const results = [];
for (const t of tests) {
  process.stdout.write(`\n──── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}\n`);
  const started = Date.now();
  const out = await new Promise(res => {
    const p = spawn(process.execPath, [t], {
      cwd: new URL('.', import.meta.url).pathname,
      env: { ...process.env, BASE: `http://127.0.0.1:${PORT}` },
      stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    p.stdout.on('data', d => { buf += d; process.stdout.write(d); });
    p.stderr.on('data', d => { buf += d; process.stderr.write(d); });
    p.on('close', code => res({ code, buf }));
  });
  const line = (out.buf.match(/^RESULT .*$/m) || [])[0];
  results.push({ t, ok: out.code === 0, secs: ((Date.now() - started) / 1000).toFixed(0), line });
}

console.log('\n' + '═'.repeat(66));
results.forEach(r => console.log(
  `  ${r.ok ? 'OK  ' : 'FEL '} ${r.t.padEnd(20)} ${String(r.secs).padStart(3)}s  ${r.line || '(inget RESULT)'}`));
const bad = results.filter(r => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} gröna`);
server.kill();
process.exit(bad ? 1 : 0);
