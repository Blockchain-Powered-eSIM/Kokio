/**
 * The single logging seam for the app. It replaces every direct `console.*`
 * call site (enforced by scripts/scan-console.mjs). There is exactly one
 * __DEV__ gate and one place where release redaction is decided.
 *
 * Behaviour:
 *   Development  ->  prints `[code]` (+ context) to the console at the mapped level.
 *                    Also retains a redacted record.
 *   Release      ->  prints nothing; retains a redacted `{ ts, level, code }`
 *                    record in a bounded in-memory ring buffer.
 *                    This is the local diagnostic record.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;         // Epoch milliseconds at capture time.
  level: LogLevel;
  code: string;       // Static, non-identifying event code.
}

// ─── Bounded in-memory record ─────────────────────────────────────────────────

/**
 * FIFO ring buffer. 
 * Non-identifying by construction (only ts/level/code are stored), 
 * It is safe to retain in release for a future support/diagnostics surface to read via getRecentEntries().
 */
const MAX_ENTRIES = 100;
const _entries: LogEntry[] = [];

function record(level: LogLevel, code: string): void {
  _entries.push({ ts: Date.now(), level, code });
  if (_entries.length > MAX_ENTRIES) {
    _entries.splice(0, _entries.length - MAX_ENTRIES);
  }
}

// Snapshot of retained records, oldest first. Safe to expose to a UI surface.
export function getRecentEntries(): readonly LogEntry[] {
  return _entries.slice();
}

// Clears retained records.
export function clearRecentEntries(): void {
  _entries.length = 0;
}

// ─── Level -> console method (development only) ─────────────────────────────────

// Names are resolved to a `console` method at call time.
const _consoleMethod: Record<LogLevel, 'log' | 'info' | 'warn' | 'error'> = {
  debug: 'log',
  info:  'info',
  warn:  'warn',
  error: 'error',
};

// ─── Core ──────────────────────────────────────────────────────────────────────

function emit(level: LogLevel, code: string, context?: unknown): void {
  if (__DEV__) {
    const method = _consoleMethod[level];
    if (context === undefined) {
      console[method](`[${code}]`);
    } else {
      console[method](`[${code}]`, context);
    }
  }
  // Always retain the redacted record. `context` is intentionally never stored,
  // so nothing dynamic or identifying can reach the release record.
  record(level, code);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const logger = {
  debug: (code: string, context?: unknown): void => emit('debug', code, context),
  info:  (code: string, context?: unknown): void => emit('info',  code, context),
  warn:  (code: string, context?: unknown): void => emit('warn',  code, context),
  error: (code: string, context?: unknown): void => emit('error', code, context),
};
