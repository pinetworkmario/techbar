import "server-only";
import { spawn } from "child_process";

export interface PingResult {
  reachable: boolean;
  latencyMs?: number;
  checkedAt: number;
  error?: string;
}

const cache = new Map<string, PingResult>();
const TTL_MS = 30_000;

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

function looksLikeIp(s: string): boolean {
  return IPV4_RE.test(s);
}

function runPing(host: string): Promise<PingResult> {
  return new Promise((resolve) => {
    const args = ["-c", "1", "-W", "2", host];
    const p = spawn("ping", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    p.stdout.on("data", (b) => (stdout += b.toString()));
    let resolved = false;
    const finish = (r: PingResult) => {
      if (resolved) return;
      resolved = true;
      resolve(r);
    };
    const killer = setTimeout(() => {
      p.kill("SIGKILL");
      finish({
        reachable: false,
        checkedAt: Date.now(),
        error: "ping timeout",
      });
    }, 3000);
    p.on("close", (code) => {
      clearTimeout(killer);
      if (code === 0) {
        const m = stdout.match(/time[=<]([\d.]+)\s*ms/);
        finish({
          reachable: true,
          latencyMs: m ? Number(m[1]) : undefined,
          checkedAt: Date.now(),
        });
      } else {
        finish({ reachable: false, checkedAt: Date.now() });
      }
    });
    p.on("error", (e) => {
      clearTimeout(killer);
      finish({
        reachable: false,
        checkedAt: Date.now(),
        error: String(e.message || e),
      });
    });
  });
}

export async function pingHost(host: string): Promise<PingResult> {
  if (!host || !looksLikeIp(host)) {
    return {
      reachable: false,
      checkedAt: Date.now(),
      error: "invalid IPv4",
    };
  }
  const cached = cache.get(host);
  if (cached && Date.now() - cached.checkedAt < TTL_MS) return cached;
  const r = await runPing(host);
  cache.set(host, r);
  return r;
}
