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

## 게시판 (HTML·CSS만 사용)

게시판 기능에는 JavaScript를 쓰지 않았어요. 자바스크립트를 꺼도 똑같이 동작해요.

| 기능 | 만든 방법 |
|---|---|
| 분류 탭 (전체·자유·질문·정보) | 숨긴 라디오 버튼 + `label` + CSS `:checked ~` 선택자. 공지는 항상 맨 위에 보여요 |
| 글 보기 | 글마다 `<article id="post-번호">`를 두고, 주소가 `#post-번호`일 때만 CSS `:target`으로 보여줌. `:has()`로 글을 볼 땐 목록을 숨김 |
| 글쓰기 빈칸 확인 | HTML `required`, `minlength`, `maxlength` + CSS `:user-invalid` |
| 등록 후 안내 | 폼이 `write.html#done`으로 이동 → `:target`으로 안내 표시 |
| 모바일 | 640px 이하에서 표를 카드처럼 바꿔 보여줌 |

> 서버가 없어서 **글쓰기 화면에서 등록한 글은 저장되지 않아요.** 입력칸에 `name` 속성을 넣지 않아서, 입력한 내용이 주소창에 남지도 않아요.

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

## 데이터베이스 (SQLite)

게시글을 저장할 SQLite 데이터베이스예요. 지금은 테이블 1개(`posts`)만 있어요.

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
