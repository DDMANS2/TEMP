// GET /api/me   지금 로그인한 회원 확인 → {ok:true, user:{nickname}|null}
import { json } from "../_lib/util.js";
import { currentUser } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const u = await currentUser(request, env);
  return json({ ok: true, user: u ? { nickname: u.nickname } : null });
}
