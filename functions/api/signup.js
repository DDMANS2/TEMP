// POST /api/signup   {nickname, email, password, gender, zipcode, address1, address2?, agree}
import { json, fail, readJson, str, hashPassword } from "../_lib/util.js";
import { clientId, keyOf, count, bump } from "../_lib/ratelimit.js";

const GENDER = { 여성: "female", 남성: "male", "선택 안 함": "none", female: "female", male: "male", none: "none" };

export async function onRequestPost({ request, env }) {
  // 요청 제한: 같은 접속지(IP)에서 10분에 5번까지 (가입 도배 방어)
  const ipKey = await keyOf("signup-ip", clientId(request));
  const rl = await count(env, ipKey);
  if (rl.n >= 5) return json({ ok: false, error: "가입 시도가 너무 많아요. 잠시 후 다시 해 주세요." }, 429, { "retry-after": String(Math.max(1, rl.retryAfter)) });
  await bump(env, ipKey, 10 * 60);

  const b = await readJson(request);
  if (!b) return fail(400, "요청 형식이 올바르지 않아요.");
  const nickname = str(b.nickname), email = str(b.email), password = typeof b.password === "string" ? b.password : "";
  const gender = GENDER[str(b.gender)], zipcode = str(b.zipcode), address1 = str(b.address1), address2 = str(b.address2) || null;

  if (nickname.length < 2 || nickname.length > 12) return fail(400, "닉네임은 2~12자예요.");
  if (!/^[가-힣a-zA-Z0-9_-]+$/.test(nickname)) return fail(400, "닉네임은 한글, 영문, 숫자와 _ - 만 쓸 수 있어요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(400, "이메일 형식을 확인해 주세요.");
  if (password.length < 8 || password.length > 128) return fail(400, "비밀번호는 8자 이상이에요.");
  if (!gender) return fail(400, "성별을 선택해 주세요.");
  if (!/^[0-9]{5}$/.test(zipcode)) return fail(400, "우편번호는 숫자 5자리예요.");
  if (!address1) return fail(400, "기본 주소를 입력해 주세요.");
  if (b.agree !== true) return fail(400, "개인정보 수집·이용에 동의해 주세요.");

  try {
    const r = await env.DB.prepare(
      "INSERT INTO users (nickname, email, password_hash, gender, zipcode, address1, address2) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(nickname, email, await hashPassword(password), gender, zipcode, address1, address2).run();
    return json({ ok: true, id: r.meta.last_row_id }, 201);
  } catch (e) {
    const m = String(e.message || e);
    if (m.includes("users.nickname")) return fail(409, "이미 사용 중인 닉네임이에요.");
    if (m.includes("users.email")) return fail(409, "이미 가입된 이메일이에요.");
    return fail(500, "가입하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
