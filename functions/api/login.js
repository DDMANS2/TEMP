// POST /api/login   {email, password}
// 비밀번호 확인 + 마지막 로그인 시각 기록 + 로그인 상태 기억(쿠키 세션, 7일)
import { json, fail, readJson, str, verifyPassword } from "../_lib/util.js";
import { createSession } from "../_lib/session.js";

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!b) return fail(400, "요청 형식이 올바르지 않아요.");
  const email = str(b.email), password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return fail(400, "이메일과 비밀번호를 입력해 주세요.");

  const user = await env.DB.prepare("SELECT id, nickname, password_hash FROM users WHERE email = ?").bind(email).first();
  // 이메일이 없어도 같은 메시지를 줘서, 가입 여부를 알아내지 못하게 해요
  if (!user || !(await verifyPassword(password, user.password_hash))) return fail(401, "이메일 또는 비밀번호가 맞지 않아요.");

  await env.DB.prepare("UPDATE users SET last_login_at = strftime('%Y-%m-%d %H:%M:%S', 'now', '+9 hours') WHERE id = ?").bind(user.id).run();
  const setCookie = await createSession(env, user.id);
  return json({ ok: true, nickname: user.nickname }, 200, { "set-cookie": setCookie });
}
