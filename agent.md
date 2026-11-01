# agent.md — TEMP(로드스터 팬 페이지) 작업 하네스

이 파일은 AI 에이전트(Claude 등)가 이 저장소에서 작업을 이어받을 때 **먼저 읽는 안내서**예요.
에이전트는 작업 시작 전에 이 파일 → `README.md` 순서로 읽고, `git pull`로 최신 상태부터 받아요(사용자가 파일을 직접 고칠 수 있어요).

## 1. 한눈에 보기

| 항목 | 내용 |
|---|---|
| 서비스 | 로드스터 비공식 팬 페이지 (연습용 프로젝트) + 게시판·회원가입·로그인 |
| 저장소 | GitHub `DDMANS2/TEMP` (`main` 브랜치) |
| **실서비스 주소** | https://temp-5xb.pages.dev — Cloudflare Pages 프로젝트 `temp` (Git 연결, `main` 푸시 시 **자동 배포**) |
| 보조 주소 | https://ddmans2.github.io/TEMP/ — GitHub Pages. **서버가 없어서** 예전 연습용 화면으로만 동작(저장 안 됨) |
| 서버 | Cloudflare Pages Functions(= Workers) — `functions/` 폴더 |
| 데이터베이스 | Cloudflare D1 `temp-board` (코드에서는 `env.DB`) |
| 화면 | 순수 HTML·CSS 기본 + `api.js`가 서버와 연결 (프레임워크 없음) |

## 2. 사용자와 일하는 방식 (중요)

- **항상 한국어**로, 개발을 모르는 사람도 이해하게 **쉬운 말·비유**로 답해요.
- 보통 "만들고 → 커밋 → 푸시 → 배포 확인"까지 한 묶음이에요. 푸시 후 실제 주소가 열리는지 확인해서 보고해요.
- **범위를 넓히지 않아요.** 처음엔 "HTML·CSS만으로", 그다음 "DB부터", "백엔드는 만들지 마"였고, 사용자가 "Workers와 Pages를 연동해줘"라고 명시했을 때 서버를 만들었어요. 새 기능은 요청받은 만큼만 해요.
- 확인하지 않은 것을 확인했다고 하지 않아요(예: 모바일 화면을 못 봤으면 그렇게 말해요).
- 결과 보고: 바뀐 것 / 확인한 것 / 아직 안 된 것(솔직하게) 순서로 짧게.

## 3. 폴더 구조

```
TEMP/
├─ agent.md / CLAUDE.md          ← 이 안내서 (CLAUDE.md는 이 파일을 불러오는 한 줄)
├─ README.md                     ← 사람용 설명 (페이지 표, 게시판·API·DB 설명)
├─ index.html highlights.html specs.html charging.html timeline.html faq.html   ← 팬 페이지 본문
├─ board.html write.html         ← 게시판 목록·글 보기 / 글쓰기
├─ signup.html login.html        ← 회원가입 / 로그인
├─ style.css script.js           ← 공통 디자인(어두운 배경, 빨강 강조) / 메뉴·스크롤 효과
├─ api.js                        ← 게시판·글쓰기·가입·로그인을 /api 와 연결 (서버 없으면 아무것도 안 함)
├─ functions/
│  ├─ _middleware.js             ← 모든 응답에서 와일드카드 CORS(`*`) 제거, 허용 출처만 허용, /api에 nosniff
│  ├─ _lib/ratelimit.js          ← 요청 횟수 제한(D1 `rate_limits`, 키는 해시). 오류 시 통과(fail-open)
│  ├─ _lib/session.js            ← 로그인 세션(쿠키 토큰, DB엔 해시만). `sessions` 표는 처음 쓸 때 자동 생성
│  ├─ _lib/files.js              ← 첨부 사진(이미지만, 3장·1MB). D1에 base64 조각으로 저장, 종류는 파일 내용으로 판별. 표는 처음 쓸 때 자동 생성
│  ├─ _lib/util.js               ← JSON 응답, 입력 읽기, PBKDF2 비밀번호 해시
│  └─ api/  posts/index.js  posts/[id].js  files/[id].js  signup.js  login.js  me.js  logout.js
├─ _headers                      ← 정적 화면 보안 헤더(X-Frame-Options·CSP·HSTS 등). 외부 리소스를 추가하면 CSP도 고쳐요
├─ wrangler.toml                 ← Pages 설정 + D1 바인딩(DB). 이 파일이 설정의 기준
├─ db/  schema.sql  seed.sql     ← 테이블 정의, 예시 글 5개 (board.db 파일은 .gitignore)
└─ images/
```

## 4. 서버 API

| 주소 | 방식 | 하는 일 |
|---|---|---|
| `/api/posts` | GET | 목록 (`?category=free\|qna\|info\|notice`), 공지가 맨 위 |
| `/api/posts` | POST | 글쓰기 `{category, title, content, files?[{name,data(base64)}]}` — 사진 ≤3장·각 ≤1MB, **로그인 필수(401)**, 작성자=세션 닉네임(보낸 author는 무시), `notice`는 거부 |
| `/api/posts/번호` | GET | 글 보기 (조회수 +1) + `files:[{id,name,mime,size}]` |
| `/api/files/번호` | GET | 첨부 이미지 (nosniff·CSP sandbox, 1일 캐시) |
| `/api/signup` | POST | 가입 `{nickname, email, password, gender, zipcode, address1, address2?, agree}` |
| `/api/login` | POST | 이메일·비밀번호 확인 + `last_login_at` 기록 + **세션 쿠키 `sid`**(HttpOnly·Secure·SameSite=Lax, 7일) |
| `/api/me` | GET | 로그인한 회원 `{user:{nickname}\|null}` |
| `/api/logout` | POST | 세션 삭제 + 쿠키 만료 |

- **요청 제한**: `/api/login` 같은 IP 1분 10회, 같은 이메일 15분 안에 5번 틀리면 15분 잠금(없는 이메일도 동일). `/api/signup` 같은 IP 10분 5회. 초과 시 429 + `Retry-After`. 닉네임은 한글·영문·숫자·`_`·`-`만(화면·서버 동일, DB CHECK는 아님).
- 입력 규칙은 화면(HTML), API, DB `CHECK` 세 곳이 **같아야** 해요. 하나를 바꾸면 셋 다 바꿔요.
- 비밀번호는 PBKDF2(SHA-256, 10만 회)를 `pbkdf2$횟수$솔트$해시`로 저장해요. 원문은 저장하지 않아요. Workers에서 PBKDF2 반복은 10만 회가 상한이에요.
- 로그인 실패 메시지는 이메일이 없어도, 비밀번호가 틀려도 **같게** 보여요(가입 여부 노출 방지).

## 5. DB 스키마 요약

- `posts`: `id, category(notice|free|qna|info), title(1~60), author(2~12), content(5자+), views, created_at(KST, 자동), updated_at`
- `attachments`(글 번호 FK, name, mime, size) / `attachment_chunks`(base64 조각 60,000자씩): 글 삭제 시 CASCADE. D1은 한 번에 넣는 크기에 한계가 있어 조각으로 나눠 저장.
- `users`: `id, nickname(2~12, 유일·대소문자 무시), email(유일·대소문자 무시), password_hash(20자+), gender(female|male|none), zipcode(숫자5), address1, address2, agreed_at, created_at, last_login_at`
- 현재 D1 상태: `posts` 5개(예시 글), `users` 0명, 첨부 없음.
- 정의는 `db/schema.sql`이 기준이에요. D1은 `.db` 파일을 그대로 올릴 수 없어서 **SQL 파일로** 적용해요.
  - D1에 적용할 때는 `PRAGMA` 줄을 뺀 사본을 써요: `grep -v '^PRAGMA' db/schema.sql > /tmp/s.sql`
  - 스키마를 바꿀 땐 `ALTER`/새 마이그레이션 SQL을 만들어 원격 D1에 적용하고, `schema.sql`도 함께 고쳐요.

## 6. 개발·테스트 방법

```bash
npm i -g wrangler                                  # 이미 설치돼 있을 수 있음
# 로컬 서버 (D1은 로컬 파일로 흉내): wrangler.toml 바인딩을 그대로 씀
wrangler d1 execute temp-board --local --persist-to /tmp/d1 -y --file=/tmp/s.sql
wrangler d1 execute temp-board --local --persist-to /tmp/d1 -y --file=db/seed.sql
nohup wrangler pages dev . --port 8790 --persist-to /tmp/d1 > /tmp/dev.log 2>&1 &
curl -s localhost:8790/api/posts
```

- `wrangler pages dev`는 `.html`을 뗀 주소(`/login`)로 리다이렉트해요(308). 정상이에요.
- 로컬 workerd가 지원하는 호환성 날짜는 서버 쪽보다 늦게 따라와요. `wrangler.toml`의 `compatibility_date`는 **로컬이 지원하는 날짜 이하**(현재 `2026-10-30`)로 둬요.
- 로컬 테스트로 만든 데이터는 로컬 파일에만 있어요. **실서비스 D1에 시험 데이터를 넣었다면 반드시 지워요** (`wrangler d1 execute temp-board --remote --command "DELETE ..."`).
- 화면 테스트는 Playwright(Chromium 설치돼 있음)로 하고, 입력 규칙·오류 메시지·서버 없을 때 폴백까지 확인해요.
- 사용자 입력을 화면에 넣을 때는 **`textContent`만** 써요(`innerHTML` 금지). `api.js`의 글 렌더링이 그 예예요.

## 7. 배포와 Cloudflare 인증

- 푸시하면 Cloudflare Pages가 자동 배포해요(빌드 명령 없음, 루트 `.`를 그대로 게시). 배포 상태는 API로 확인해요:
  `GET /accounts/<계정ID>/pages/projects/temp/deployments?per_page=1` → `latest_stage` 가 `deploy / success`.
- 루트를 그대로 게시하므로 **이 저장소의 모든 파일이 공개 주소로 보여요**(`agent.md`, `db/*.sql` 포함). 비밀 정보는 절대 넣지 않아요.
- 인증: 사용자가 준 **API 토큰을 `CLOUDFLARE_API_TOKEN` 환경변수로만** 쓰고, 계정 ID는 `CLOUDFLARE_ACCOUNT_ID`로 줘요(대시보드 주소 `dash.cloudflare.com/<계정ID>/…`). 토큰은 파일·커밋·README에 저장하지 않고, 작업이 끝나면 사용자에게 **대시보드에서 삭제**하도록 안내해요.
- 토큰에 필요한 권한: 계정 · Cloudflare Pages · 편집 / 계정 · D1 · 편집 (+ 계정 설정 · 읽기를 주면 계정 ID를 안 줘도 됨).
- `wrangler login`(OAuth)은 이 환경에서 브라우저 콜백이 어려워 쓰지 않았어요.

## 8. 환경 제약과 겪은 문제 (같은 실수 반복 금지)

| 상황 | 대처 |
|---|---|
| 작업 환경(클라우드 컨테이너)은 외부 접속 제한 | npm·GitHub·`api.cloudflare.com`은 열림. `dash.cloudflare.com` 직접 접속은 403 |
| `gh repo create` 차단 | 사용자가 저장소를 만들고, 세션에는 `add_repo`로 연결 |
| `gh api .../pages/builds` 등 일부 GitHub API가 프록시에서 403 | 배포 상태는 Cloudflare API 또는 `curl`로 확인 |
| JS를 끈 Playwright에서 "element not stable" | `force=True` 클릭으로 우회 |
| 게시판 태그 이름이 사양 페이지와 달랐음 | 사양 태그는 **주장·보도·추정·미공개** (“발언” 아님) |
| `sleep N` 후 다른 명령 이어 쓰기 | 시스템이 막음. 폴링은 짧은 반복이나 백그라운드로 |
| `pkill -f "문자열"` | 자기 명령줄에도 매칭돼 종료 코드 144로 끊김. PID로 종료하거나 `fuser -k 포트/tcp` |
| `wrangler d1 execute ... --file`에 `PRAGMA` 포함 | 제외한 사본으로 적용 |
| `wrangler pages dev --d1=DB`와 toml 바인딩이 겹침 | `--d1` 옵션을 빼고 `wrangler.toml`의 바인딩만 사용 |
| 안 뜨는 로컬 서버가 포트를 잡고 있음 | 옛 wrangler/workerd 프로세스를 PID로 종료한 뒤 다시 시작 |

## 9. 이 프로젝트에서 한 일 (시간순)

1. 로드스터 팬 페이지에 **게시판 추가** — HTML·CSS만으로: 숨긴 라디오+label+`:checked ~`(분류 탭), `:target`+`:has()`(글 보기), `required/minlength`+`:user-invalid`(입력 확인).
2. 글쓰기 화면은 저장되지 않는 연습용(입력칸에 `name` 속성이 없어 주소창에 내용이 안 남음).
3. **SQLite DB 설계**: `db/schema.sql`, `db/seed.sql`, `posts` 테이블, CHECK 제약(글쓰기 화면 규칙과 동일). `*.db`는 공개 노출 방지를 위해 `.gitignore`.
4. **회원가입·로그인 화면** 추가(닉네임·이메일·성별·집 주소[우편번호·기본·상세], 비밀번호 추가) — 주소검색 버튼은 만들지 않았어요(직접 입력).
5. **`users` 테이블** 추가(스키마만, 백엔드는 만들지 않음).
6. 사용자가 서버 연동을 요청 → **D1 `temp-board` 생성**, 스키마·예시 글 적용, **Pages Functions API** 작성, 기존 Pages 프로젝트 `temp`와 연결·배포.
7. **`api.js`로 화면 연결**: 게시판 목록·글 보기(조회수), 글쓰기, 가입, 로그인. 서버가 없으면 기존 연습용 화면으로 폴백.
8. 배포 후 실서비스에서 글쓰기·가입·로그인을 한 번씩 시험하고 **시험 데이터는 삭제**함.
9. **로그인 세션 + 글쓰기 로그인 제한**: 쿠키 세션(`sid`), `/api/me`·`/api/logout`, 글쓰기는 로그인한 회원만(작성자는 세션 닉네임). 헤더에 닉네임·로그아웃 표시. 서버 없는 GitHub Pages에서는 예전 연습용 화면 그대로. 실서비스에서 가입·로그인까지 한 시험은 하지 않음(시험 데이터 삭제에 토큰 필요).
10. **글쓰기 버튼 잠금**: 로그인 전엔 🔒 표시(회색), 누르면 로그인 화면.
11. **사진 첨부**(이미지만, D1 저장, 최대 3장·1MB): 글쓰기에서 선택·미리보기·삭제, 글 보기에서 사진 표시, 목록에 📎. 실서비스에서 업로드까지 한 시험은 하지 않음(시험 데이터 삭제용 토큰이 없음).
12. **GitHub 이슈 #3~#16 대응**(모바일 가로넘침, 빈 분류 안내, readonly 스타일, 닉네임 문자 제한, #done 직접 접근, next 파라미터, 상세글 로그인 안내, 보안 헤더, 공백 검증, 모바일 메뉴 높이, 요청 제한, CORS, 제목 계층, 잘못된 글 해시). 이슈는 `gh api repos/DDMANS2/TEMP/issues`(GraphQL 불가)로 읽고 댓글·닫기.

## 10. 아직 안 된 것 / 다음 후보 (사용자가 요청할 때만)

- 댓글(`comments` 테이블 + API): 예시 글의 댓글은 아직 DB에 없음.
- 본인 글 수정·삭제, 공지 작성(운영자 권한) — 세션은 있으니 `currentUser()`로 구현 가능.
- 가입·로그인 남용 방지(요청 횟수 제한), 이메일 인증, 비밀번호 재설정.
- 페이지네이션(현재 최대 100개), 검색.
- 모바일 가입 화면 실기기 확인(데스크톱과 메뉴만 확인함).
- GitHub Pages 주소(서버 없음)를 계속 둘지, 안내 문구를 띄울지 결정.
