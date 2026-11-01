// 게시글 첨부파일(이미지): D1에 저장해요. D1은 한 번에 넣을 수 있는 크기가 작아서 파일을 조각(chunk)으로 나눠 저장합니다.
//  · attachments        : 파일 1개당 1행 (글 번호, 이름, 종류, 크기)
//  · attachment_chunks  : 파일 내용을 base64 글자 조각으로 나눠 저장
// 올린 파일의 "종류"는 사용자가 말한 값이 아니라 파일 내용(맨 앞 몇 바이트)을 직접 보고 판단해요.
export const MAX_FILES = 3;
export const MAX_BYTES = 1024 * 1024; // 파일 1개 최대 1MB
const CHUNK = 60000; // base64 글자 수 (D1의 100KB 한계 안쪽)

let ready = false;
export async function ensureFiles(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','+9 hours')))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_attachments_post ON attachments (post_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS attachment_chunks (attachment_id INTEGER NOT NULL REFERENCES attachments(id) ON DELETE CASCADE, seq INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (attachment_id, seq))"),
  ]);
  ready = true;
}

// 파일 맨 앞 바이트로 이미지 종류 판별 (png/jpeg/gif/webp 만 허용, svg 등은 거부)
export function sniff(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

const cleanName = (n) => String(n || "image").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "").trim().slice(0, 80) || "image";

// 요청의 files 를 검사해서 [{name, mime, size, b64}] 로 돌려줘요. 문제가 있으면 {error}
export function parseFiles(files) {
  if (files == null) return { files: [] };
  if (!Array.isArray(files)) return { error: "첨부파일 형식이 올바르지 않아요." };
  if (files.length > MAX_FILES) return { error: `사진은 최대 ${MAX_FILES}장까지 올릴 수 있어요.` };
  const out = [];
  for (const f of files) {
    const b64 = f && typeof f.data === "string" ? f.data : "";
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) return { error: "첨부파일을 읽을 수 없어요." };
    let bytes;
    try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return { error: "첨부파일을 읽을 수 없어요." }; }
    if (bytes.length > MAX_BYTES) return { error: "사진 한 장은 1MB 이하만 올릴 수 있어요." };
    const mime = sniff(bytes);
    if (!mime) return { error: "사진(png, jpg, gif, webp)만 올릴 수 있어요." };
    out.push({ name: cleanName(f.name), mime, size: bytes.length, b64 });
  }
  return { files: out };
}

// 글을 저장한 뒤 파일들을 저장해요
export async function saveFiles(env, postId, files) {
  for (const f of files) {
    const r = await env.DB.prepare("INSERT INTO attachments (post_id, name, mime, size) VALUES (?, ?, ?, ?)").bind(postId, f.name, f.mime, f.size).run();
    const aid = r.meta.last_row_id;
    const stmts = [];
    for (let i = 0, seq = 0; i < f.b64.length; i += CHUNK, seq++) {
      stmts.push(env.DB.prepare("INSERT INTO attachment_chunks (attachment_id, seq, data) VALUES (?, ?, ?)").bind(aid, seq, f.b64.slice(i, i + CHUNK)));
    }
    await env.DB.batch(stmts);
  }
}

export async function listFiles(env, postId) {
  await ensureFiles(env);
  const { results } = await env.DB.prepare("SELECT id, name, mime, size FROM attachments WHERE post_id = ? ORDER BY id").bind(postId).all();
  return results;
}
