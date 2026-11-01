// 공통 도우미: JSON 응답, 입력 읽기, 비밀번호 해시(PBKDF2)

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });

export const fail = (status, message) => json({ ok: false, error: message }, status);

// JSON 본문만 받음 (다른 사이트의 폼 전송을 막는 데도 도움이 됨)
export async function readJson(request) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) return null;
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

export const str = (v) => (typeof v === "string" ? v.trim() : "");

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 100000; // Workers 에서 허용하는 PBKDF2 최대 반복 횟수

async function derive(password, salt, iter) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
}

// 비밀번호 → "pbkdf2$반복횟수$솔트$해시" (원문은 저장하지 않음)
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(await derive(password, salt, ITER))}`;
}

export async function verifyPassword(password, stored) {
  const [kind, iter, salt, hash] = String(stored).split("$");
  if (kind !== "pbkdf2") return false;
  const got = new Uint8Array(await derive(password, unb64(salt), Number(iter)));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
