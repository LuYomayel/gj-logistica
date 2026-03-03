/**
 * Simple ETL logger — prints to stdout with timestamp and module tag.
 */

export function log(module: string, message: string): void {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  console.log(`[${ts}] [${module.toUpperCase().padEnd(18)}] ${message}`);
}

export function logError(module: string, err: unknown): void {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${ts}] [${module.toUpperCase().padEnd(18)}] ❌ ERROR: ${msg}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
}
