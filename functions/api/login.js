// POST /api/login   {email, password}
// 비밀번호 확인 + 마지막 로그인 시각 기록 + 로그인 상태 기억(쿠키 세션, 7일)
// 요청 제한: 같은 접속지(IP)에서 1분에 10번까지, 같은 이메일은 15분 안에 5번 틀리면 15분 동안 잠시 막아요.
import { json, fail, readJson, str, verifyPassword } from "../_lib/util.js";
import { createSession } from "../_lib/session.js";
import { clientId, keyOf, count, bump, clear } from "../_lib/ratelimit.js";

const tooMany = (secs) => json({ ok: false, error: "시도가 너무 많아요. 잠시 후 다시 해 주세요." }, 429, { "retry-after": String(Math.max(1, secs)) });

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!b) return fail(400, "요청 형식이 올바르지 않아요.");
  const email = str(b.email), password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return fail(400, "이메일과 비밀번호를 입력해 주세요.");

  const ipKey = await keyOf("login-ip", clientId(request)), failKey = await keyOf("login-fail", email);
  const ip = await count(env, ipKey);
  if (ip.n >= 10) return tooMany(ip.retryAfter);
  const fails = await count(env, failKey);
  if (fails.n >= 5) return tooMany(fails.retryAfter); // 없는 이메일도 똑같이 세어서, 가입 여부를 알아내지 못하게 해요
  await bump(env, ipKey, 60);

  const user = await env.DB.prepare("SELECT id, nickname, password_hash FROM users WHERE email = ?").bind(email).first();
  // 이메일이 없어도 같은 메시지를 줘서, 가입 여부를 알아내지 못하게 해요
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await bump(env, failKey, 15 * 60);
    return fail(401, "이메일 또는 비밀번호가 맞지 않아요.");
  }
  await clear(env, failKey);

  await env.DB.prepare("UPDATE users SET last_login_at = strftime('%Y-%m-%d %H:%M:%S', 'now', '+9 hours') WHERE id = ?").bind(user.id).run();
  const setCookie = await createSession(env, user.id);
  return json({ ok: true, nickname: user.nickname }, 200, { "set-cookie": setCookie });
}
