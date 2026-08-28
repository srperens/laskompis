/* One machine-readable line per test, so the runner can judge without parsing
   prose. Printed last; the human-readable detail above it is the point when
   something fails. */
export function verdict(ok, detail){
  console.log(`RESULT ${ok ? 'ok' : 'fail'} — ${detail}`);
  if(!ok) process.exitCode = 1;
}
