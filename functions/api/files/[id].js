// GET /api/files/번호   첨부 이미지 보기 (글에 붙은 사진)
import { fail } from "../../_lib/util.js";
import { ensureFiles } from "../../_lib/files.js";

export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return fail(400, "파일 번호가 올바르지 않아요.");
  await ensureFiles(env);
  const f = await env.DB.prepare("SELECT name, mime, size FROM attachments WHERE id = ?").bind(id).first();
  if (!f) return fail(404, "파일을 찾을 수 없어요.");
  const { results } = await env.DB.prepare("SELECT data FROM attachment_chunks WHERE attachment_id = ? ORDER BY seq").bind(id).all();
  const bytes = Uint8Array.from(atob(results.map((r) => r.data).join("")), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": f.mime,
      "content-length": String(bytes.length),
      // 이미지로만 열리게 하고, 혹시 스크립트가 섞여 있어도 실행되지 않게 막아요
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; sandbox",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "cache-control": "public, max-age=86400",
    },
  });
}
