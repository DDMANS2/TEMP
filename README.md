# TEMP

로드스터 비공식 팬 페이지 (연습용 프로젝트)

## 페이지

| 파일 | 내용 |
|---|---|
| `index.html` | 홈 (공식 영상, 둘러보기) |
| `highlights.html` | 특징 |
| `specs.html` | 사양 |
| `charging.html` | 충전 계산기 |
| `timeline.html` | 연혁 |
| `faq.html` | FAQ |
| `board.html` | **게시판** — 글 목록 + 글 보기 |
| `write.html` | **게시판 글쓰기** 화면 |
| `signup.html` | **회원가입** 화면 (닉네임·이메일·성별·집 주소) |
| `login.html` | **로그인** 화면 |

## 게시판 (HTML·CSS만 사용)

게시판 화면의 기본 동작(탭·글 보기·입력 확인)은 JavaScript 없이 HTML·CSS만으로 만들었어요. 서버(`/api`)가 있는 주소에서는 `api.js`가 서버 글로 바꿔 주고, 서버가 없는 곳(GitHub Pages 등)에서는 아래 연습용 화면이 그대로 동작해요.

| 기능 | 만든 방법 |
|---|---|
| 분류 탭 (전체·자유·질문·정보) | 숨긴 라디오 버튼 + `label` + CSS `:checked ~` 선택자. 공지는 항상 맨 위에 보여요 |
| 글 보기 | 글마다 `<article id="post-번호">`를 두고, 주소가 `#post-번호`일 때만 CSS `:target`으로 보여줌. `:has()`로 글을 볼 땐 목록을 숨김 |
| 글쓰기 빈칸 확인 | HTML `required`, `minlength`, `maxlength` + CSS `:user-invalid` |
| 등록 후 안내 | 폼이 `write.html#done`으로 이동 → `:target`으로 안내 표시 |
| 모바일 | 640px 이하에서 표를 카드처럼 바꿔 보여줌 |

> 서버가 없는 곳에서는 **글쓰기 화면에서 등록한 글이 저장되지 않아요.** 서버가 있는 주소(Cloudflare Pages)에서는 `api.js`가 글을 D1에 저장해요. 입력칸에 `name` 속성을 넣지 않아서, 입력한 내용이 주소창에 남지도 않아요.

### 새 글 올리는 방법

`board.html`을 열고 두 군데에 추가하면 돼요. 아래 예시는 6번 글이에요.

**1) 목록 (`<tbody>` 맨 위, 공지 바로 아래)** — 분류에 맞게 `c-free` / `c-qna` / `c-info`와 배지 클래스를 바꾸세요.

```html
<tr class="row c-free">
  <td class="col-no">6</td>
  <td class="col-cat"><span class="badge free">자유</span></td>
  <td class="col-title"><a href="#post-6">글 제목 <span class="cmt">[0]</span></a></td>
  <td class="col-author">닉네임</td>
  <td class="col-date">11.02</td>
  <td class="col-view">0</td>
</tr>
```

**2) 글 내용 (`<div class="posts">` 안 맨 위)**

```html
<article class="post" id="post-6" aria-labelledby="p6">
  <a class="back" href="#list">← 목록으로</a>
  <header class="post-head">
    <span class="badge free">자유</span>
    <h2 id="p6">글 제목</h2>
    <p class="post-meta"><span>닉네임</span><span>2026.11.02</span><span>조회 0</span></p>
  </header>
  <div class="post-body">
    <p>글 내용</p>
  </div>
  <nav class="post-nav" aria-label="다른 글"><a href="#post-5">다음 글 · 이전에 올린 글 제목</a></nav>
</article>
```

댓글을 달려면 `post-body` 아래에 넣으세요.

```html
<section class="comments" aria-label="댓글 1개">
  <h3>댓글 <span>1</span></h3>
  <div class="comment"><p class="c-meta"><strong>닉네임</strong><span>11.02</span></p><p>댓글 내용</p></div>
</section>
```

분류 탭을 새로 만들려면 `board.html`에 라디오(`id="cat-새이름"`)와 `label`을 하나씩 추가하고, `style.css`의 게시판 부분에 같은 이름으로 선택자 두 줄(탭 강조, 목록 필터)을 추가하세요.

## 회원가입·로그인 (HTML·CSS만 사용)

게시판과 같은 방식이에요. 자바스크립트 없이 HTML 입력 규칙(`required`, `type="email"`, `minlength`, `pattern`)과 CSS `:user-invalid`, `:target`만 써요.

| 입력 항목 | 규칙 |
|---|---|
| 닉네임 | 2~12자 |
| 성별 | 여성 · 남성 · 선택 안 함 |
| 이메일 | 이메일 형식 |
| 비밀번호 | 8자 이상 (로그인에 필요해서 추가) |
| 집 주소 | 우편번호 5자리 + 기본 주소 + 상세 주소(선택) |

> 서버가 없는 곳에서는 **가입·로그인 정보가 전송되거나 저장되지 않아요.** 서버가 있는 주소에서는 `api.js`가 `/api/signup`, `/api/login`으로 보내서 D1에 저장·확인해요. 로그인 상태 유지(세션)는 아직 없어요.

## 서버 (Cloudflare Pages Functions + D1)

`functions/` 폴더의 파일이 그대로 API(Workers)가 돼요. 데이터는 Cloudflare D1(`temp-board`)에 저장되고, 코드에서는 `env.DB`로 써요. 설정은 `wrangler.toml`에 있어요.

| 주소 | 방식 | 하는 일 |
|---|---|---|
| `/api/posts` | GET | 글 목록 (`?category=free` 로 분류 필터) |
| `/api/posts` | POST | 글쓰기 `{category, author, title, content}` (공지는 불가) |
| `/api/posts/번호` | GET | 글 보기 (조회수 +1) |
| `/api/signup` | POST | 회원가입 `{nickname, email, password, gender, zipcode, address1, address2, agree}` |
| `/api/login` | POST | 로그인 확인 `{email, password}` (로그인 상태 유지는 아직 없음) |

- 비밀번호는 PBKDF2(SHA-256, 10만 회)로 해시해서 저장해요. 원문은 저장하지 않아요.
- 화면은 `api.js`가 이 API와 연결해요 (게시판 목록·글 보기, 글쓰기, 회원가입, 로그인).
- 이 저장소에 푸시하면 Cloudflare Pages가 자동으로 배포해요.

## 데이터베이스 (SQLite)

게시글과 회원 정보를 저장할 SQLite 데이터베이스 설계예요. 테이블은 `posts`(게시글), `users`(회원) 2개예요. 아직 홈페이지와 연결되지 않은 상태예요.

| 파일 | 내용 |
|---|---|
| `db/schema.sql` | 테이블 구조 |
| `db/seed.sql` | 게시판의 예시 글 5개 |
| `db/board.db` | 위 두 파일로 만든 DB 파일 (**저장소에는 올리지 않음**) |

### `posts` 테이블

| 컬럼 | 형식 | 설명 |
|---|---|---|
| `id` | INTEGER | 글 번호 (자동 증가) |
| `category` | TEXT | `notice`(공지) · `free`(자유) · `qna`(질문) · `info`(정보) |
| `title` | TEXT | 제목, 1~60자 |
| `author` | TEXT | 닉네임, 2~12자 |
| `content` | TEXT | 내용, 5자 이상 |
| `views` | INTEGER | 조회수 (기본 0) |
| `created_at` | TEXT | 작성 시각 (한국 시간, 자동) |
| `updated_at` | TEXT | 수정 시각 (수정했을 때만) |

글쓰기 화면(`write.html`)과 같은 입력 규칙이 DB에도 걸려 있어서, 규칙에 맞지 않는 글은 저장되지 않아요.

### `users` 테이블 (회원가입 화면과 같은 규칙)

| 컬럼 | 형식 | 설명 |
|---|---|---|
| `id` | INTEGER | 회원 번호 (자동 증가) |
| `nickname` | TEXT | 닉네임 2~12자, 중복 불가 (대소문자 구분 안 함) |
| `email` | TEXT | 이메일 형식, 중복 불가 (대소문자 구분 안 함) |
| `password_hash` | TEXT | 비밀번호를 암호화한 값 (**원문은 절대 저장하지 않음**) |
| `gender` | TEXT | `female`(여성) · `male`(남성) · `none`(선택 안 함) |
| `zipcode` | TEXT | 우편번호 숫자 5자리 |
| `address1` | TEXT | 기본 주소 |
| `address2` | TEXT | 상세 주소 (비워도 됨) |
| `agreed_at` | TEXT | 이용 안내·개인정보 동의 시각 (한국 시간, 자동) |
| `created_at` | TEXT | 가입 시각 (한국 시간, 자동) |
| `last_login_at` | TEXT | 마지막 로그인 시각 |

### DB 만들기

SQLite 설치 (Windows): https://sqlite.org/download.html 에서 **sqlite-tools-win-x64** zip을 받아 압축을 풀고, 그 폴더를 PATH에 추가하거나 `sqlite3.exe`를 저장소 폴더에 둡니다. (`winget install SQLite.SQLite` 로도 설치할 수 있어요.)

```bash
sqlite3 db/board.db < db/schema.sql   # 테이블 만들기
sqlite3 db/board.db < db/seed.sql     # 예시 글 넣기
sqlite3 -header -column db/board.db "SELECT id, category, title, author FROM posts;"
```

Windows PowerShell에서는 `<`가 안 되니 이렇게 하세요.

```powershell
Get-Content db/schema.sql -Encoding UTF8 | sqlite3 db/board.db
Get-Content db/seed.sql   -Encoding UTF8 | sqlite3 db/board.db
```

> GitHub Pages는 파일만 보여주는 곳이라 SQLite를 직접 실행할 수 없어요. 홈페이지에서 글을 저장·조회하려면 다음 단계에서 이 DB를 읽고 쓰는 작은 서버(API)를 붙여야 해요.
