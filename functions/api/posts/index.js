// GET  /api/posts?category=free   글 목록 (공지가 맨 위, 그다음 최신순)
// POST /api/posts                 글쓰기 {category, title, content, files?[{name,data(base64)}]} (사진 최대 3장·1MB) — 로그인한 회원만 (작성자는 로그인한 닉네임으로 자동 기록)
import { json, fail, readJson, str } from "../../_lib/util.js";
import { currentUser } from "../../_lib/session.js";
import { ensureFiles, parseFiles, saveFiles } from "../../_lib/files.js";

const CATEGORIES = ["notice", "free", "qna", "info"];
const WRITABLE = ["free", "qna", "info"]; // 공지는 운영자만 (화면에서도 공지는 선택 불가)

export async function onRequestGet({ request, env }) {
  const category = new URL(request.url).searchParams.get("category");
  await ensureFiles(env);
  let sql = "SELECT id, category, title, author, views, created_at, (SELECT COUNT(*) FROM attachments a WHERE a.post_id = posts.id) AS files FROM posts";
  const args = [];
  if (category) {
    if (!CATEGORIES.includes(category)) return fail(400, "알 수 없는 분류예요.");
    sql += " WHERE category = ?";
    args.push(category);
  }
  sql += " ORDER BY (category = 'notice') DESC, created_at DESC, id DESC LIMIT 100";
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ ok: true, posts: results });
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return fail(401, "로그인한 뒤에 글을 쓸 수 있어요.");
  const b = await readJson(request);
  if (!b) return fail(400, "요청 형식이 올바르지 않아요.");
  const author = user.nickname; // 화면에서 보낸 작성자 값은 믿지 않고, 로그인 정보를 써요
  const category = str(b.category), title = str(b.title), content = str(b.content);
  if (!WRITABLE.includes(category)) return fail(400, "분류를 확인해 주세요.");
  if (title.length < 1 || title.length > 60) return fail(400, "제목은 1~60자예요.");
  if (content.length < 5) return fail(400, "내용은 5자 이상 써 주세요.");
  const pf = parseFiles(b.files);
  if (pf.error) return fail(400, pf.error);
  await ensureFiles(env);
  const r = await env.DB.prepare("INSERT INTO posts (category, title, author, content) VALUES (?, ?, ?, ?)")
    .bind(category, title, author, content).run();
  const id = r.meta.last_row_id;
  try { await saveFiles(env, id, pf.files); }
  catch { await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run(); return fail(500, "사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."); }
  return json({ ok: true, id }, 201);
}
