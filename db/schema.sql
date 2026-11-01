-- 로드스터 팬 페이지 게시판 데이터베이스 (SQLite)
-- 만들기:  sqlite3 db/board.db < db/schema.sql
-- 테이블 1개(posts)에 게시글을 저장합니다. 글쓰기 화면(write.html)의 입력 규칙과 같은 조건을 DB에도 걸어 둡니다.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,                       -- 글 번호 (자동 증가)
  category    TEXT    NOT NULL
              CHECK (category IN ('notice', 'free', 'qna', 'info')),  -- 분류: 공지·자유·질문·정보
  title       TEXT    NOT NULL
              CHECK (length(trim(title)) BETWEEN 1 AND 60),             -- 제목 1~60자
  author      TEXT    NOT NULL
              CHECK (length(trim(author)) BETWEEN 2 AND 12),            -- 닉네임 2~12자
  content     TEXT    NOT NULL
              CHECK (length(trim(content)) >= 5),                       -- 내용 5자 이상
  views       INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),           -- 조회수
  created_at  TEXT    NOT NULL
              DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+9 hours')), -- 작성 시각 (한국 시간)
  updated_at  TEXT                                                     -- 수정 시각 (수정했을 때만)
);

-- 목록 화면: 분류별 최신순 조회를 빠르게
CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts (category, created_at DESC);
