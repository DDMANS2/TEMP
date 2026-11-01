// GET /api/posts/3   글 1개 보기 (조회수 +1)
import { json, fail } from "../../_lib/util.js";
import { listFiles } from "../../_lib/files.js";

export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return fail(400, "글 번호가 올바르지 않아요.");
  const post = await env.DB.prepare(
    "UPDATE posts SET views = views + 1 WHERE id = ? RETURNING id, category, title, author, content, views, created_at, updated_at"
  ).bind(id).first();
  if (!post) return fail(404, "글을 찾을 수 없어요.");
  return json({ ok: true, post, files: await listFiles(env, id) });
}
