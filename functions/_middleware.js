// 모든 요청(화면·API)의 응답에 공통으로 적용돼요.
// 다른 사이트(출처)에서 이 사이트의 API를 마음대로 읽어 가지 못하게, 와일드카드 CORS(access-control-allow-origin: *)를 걷어내요.
// 이 사이트 화면은 같은 출처에서 API를 부르므로 CORS 헤더가 필요 없어요. 허용할 외부 출처가 생기면 ALLOWED 에 추가해요.
const ALLOWED = ["https://temp-5xb.pages.dev", "https://ddmans2.github.io"];

export async function onRequest({ request, next }) {
  const res = await next();
  const headers = new Headers(res.headers);
  headers.delete("access-control-allow-origin");
  const origin = request.headers.get("origin");
  if (origin && ALLOWED.includes(origin) && origin !== new URL(request.url).origin) {
    headers.set("access-control-allow-origin", origin); // 허용 목록에 있는 출처에만 그 출처를 돌려줌
  }
  headers.append("vary", "Origin");
  if (new URL(request.url).pathname.startsWith("/api/")) headers.set("x-content-type-options", "nosniff");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
