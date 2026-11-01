// 요청 횟수 제한 (무차별 대입·가입 도배 방어). D1 표 rate_limits 에 "어떤 키가 몇 번 했는지"를 시간창과 함께 기록해요.
//  · 키는 사람 식별 정보를 그대로 두지 않도록 해시해서 저장해요 (IP·이메일 원문 저장 안 함).
//  · 이 장치가 고장 나도 로그인·가입이 막히지 않게, 오류가 나면 제한 없이 통과시켜요 (fail-open).
//  · Cloudflare 대시보드의 WAF Rate limiting 규칙과 함께 쓰면 더 튼튼해요 (README 참고).
let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)").run();
  ready = true;
}
const now = () => Math.floor(Date.now() / 1000);

async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const clientId = (request) => request.headers.get("cf-connecting-ip") || "unknown";
export const keyOf = async (scope, who) => `${scope}:${await sha(String(who).toLowerCase())}`;

// 지금까지 센 횟수 (시간창이 지났으면 0)
export async function count(env, key) {
  try {
    await ensure(env);
    const r = await env.DB.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").bind(key).first();
    return r && r.reset_at > now() ? { n: r.count, retryAfter: r.reset_at - now() } : { n: 0, retryAfter: 0 };
  } catch { return { n: 0, retryAfter: 0 }; }
}

// 횟수를 1 올려요 (시간창이 지났으면 새로 시작)
export async function bump(env, key, windowSec) {
  try {
    await ensure(env);
    const t = now();
    await env.DB.prepare(
      "INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END"
    ).bind(key, t + windowSec, t, t, t + windowSec).run();
    if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(t).run(); // 가끔 만료된 것 정리
  } catch { /* 제한 장치 오류는 무시 */ }
}

export async function clear(env, key) {
  try { await ensure(env); await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run(); } catch {}
}
