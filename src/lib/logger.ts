/**
 * Yapılandırılmış (JSON) log. Kişisel veri ve gizli değerler loglara yazılmaz:
 * bilinen hassas alanlar maskelenir, e-postalar kısaltılır.
 */
type Level = "info" | "warn" | "error";

const SENSITIVE_KEY = /pass|token|secret|authorization|cookie|iban|card|phone|address/i;

export function maskEmail(value: string): string {
  const [name, domain] = value.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

function sanitize(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY.test(key)) return "[gizli]";
  if (typeof value === "string") {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? maskEmail(value) : value.slice(0, 500);
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message.slice(0, 500), cause: sanitize(value.cause) };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v, k)]),
    );
  }
  return value;
}

function write(level: Level, event: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(context ? (sanitize(context) as Record<string, unknown>) : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => write("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => write("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => write("error", event, context),
};
