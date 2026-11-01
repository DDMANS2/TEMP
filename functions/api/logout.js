// POST /api/logout   로그아웃 (세션 삭제 + 쿠키 만료)
import { json } from "../_lib/util.js";
import { destroySession } from "../_lib/session.js";

export async function onRequestPost({ request, env }) {
  return json({ ok: true }, 200, { "set-cookie": await destroySession(request, env) });
}
