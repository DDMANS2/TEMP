// 로그인 상태 기억(세션): 무작위 토큰을 쿠키(sid)에 담고, DB에는 토큰의 해시만 저장해요.
// 쿠키는 HttpOnly(스크립트가 못 읽음) + Secure(https만) + SameSite=Lax(다른 사이트에서 보내는 요청 차단).
const COOKIE = "sid";
const DAYS = 7;

let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','+9 hours')), expires_at TEXT NOT NULL)"
  ).run();
  ready = true;
}

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(request) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([A-Za-z0-9_-]{20,})"));
  return m ? m[1] : null;
}

const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

// 로그인 성공 시: 세션을 만들고 Set-Cookie 값을 돌려줘요
export async function createSession(env, userId) {
  await ensure(env);
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < strftime('%Y-%m-%d %H:%M:%S','now','+9 hours')").run(); // 만료된 것 정리
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, strftime('%Y-%m-%d %H:%M:%S','now','+9 hours','+${DAYS} days'))`
  ).bind(await sha256(token), userId).run();
  return cookie(token, DAYS * 86400);
}

// 요청의 쿠키로 로그인한 회원을 찾아요 (없거나 만료면 null)
export async function currentUser(request, env) {
  const token = readCookie(request);
  if (!token) return null;
  await ensure(env);
  return (
    (await env.DB.prepare(
      "SELECT u.id, u.nickname FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > strftime('%Y-%m-%d %H:%M:%S','now','+9 hours')"
    ).bind(await sha256(token)).first()) || null
  );
}

// 로그아웃: 세션을 지우고, 쿠키를 만료시키는 Set-Cookie 값을 돌려줘요
export async function destroySession(request, env) {
  const token = readCookie(request);
  if (token) { await ensure(env); await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
  return cookie("", 0);
}
