/* 게시판·글쓰기·회원가입·로그인 화면을 서버(/api)와 연결해요.
 * 서버(Cloudflare Pages Functions + D1)가 없는 곳(GitHub Pages 등)에서는 아무것도 바꾸지 않고,
 * HTML에 들어 있는 연습용 화면이 그대로 동작해요. 사용자가 쓴 내용은 항상 textContent 로만 넣어요(XSS 방지). */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------- 서버가 있는지 확인 (한 번만) ---------- */
  var ready = fetch('/api/posts?category=notice', { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok && (r.headers.get('content-type') || '').indexOf('json') > -1; })
    .catch(function () { return false; });

  function call(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: '서버 응답을 읽을 수 없어요.' }; })
        .then(function (d) { d.status = r.status; return d; });
    });
  }

  function setNotice(html) {
    var n = $('.board-notice');
    if (n) { n.textContent = ''; html.forEach(function (p) { n.appendChild(p); }); }
  }
  var t = function (s) { return document.createTextNode(s); };
  var b = function (s) { return el('strong', null, s); };

  /* ---------- 날짜 ---------- */
  var mmdd = function (s) { return s.slice(5, 10).replace('-', '.'); };
  var full = function (s) { return s.slice(0, 10).replace(/-/g, '.'); };
  var isNew = function (s) { return Date.parse(s.replace(' ', 'T') + '+09:00') > Date.now() - 48 * 3600 * 1000; };

  var CAT = { notice: '공지', free: '자유', qna: '질문', info: '정보' };

  /* ================= 게시판 ================= */
  function initBoard() {
    var page = $('.board-page'), tbody = $('.board-table tbody'), posts = $('.posts');
    if (!page || !tbody) return;

    var view = null;

    function row(p) {
      var tr = el('tr', 'row c-' + p.category);
      var no = el('td', 'col-no');
      if (p.category === 'notice') no.appendChild(el('span', 'badge notice', '공지')); else no.textContent = p.id;
      var cat = el('td', 'col-cat');
      if (p.category === 'notice') cat.textContent = '공지'; else cat.appendChild(el('span', 'badge ' + p.category, CAT[p.category]));
      var title = el('td', 'col-title');
      var a = el('a', null, p.title); a.href = '#post-' + p.id; title.appendChild(a);
      if (isNew(p.created_at)) { title.appendChild(t(' ')); var n = el('span', 'new', 'N'); n.setAttribute('aria-label', '새 글'); title.appendChild(n); }
      tr.appendChild(no); tr.appendChild(cat); tr.appendChild(title);
      tr.appendChild(el('td', 'col-author', p.author));
      tr.appendChild(el('td', 'col-date', mmdd(p.created_at)));
      tr.appendChild(el('td', 'col-view', p.views));
      return tr;
    }

    function showList() {
      page.classList.remove('live-view');
      if (view) view.hidden = true;
      return call('GET', '/api/posts').then(function (d) {
        if (!d.ok) return;
        tbody.textContent = '';
        d.posts.forEach(function (p) { tbody.appendChild(row(p)); });
      });
    }

    function body(content) {
      var box = el('div', 'post-body'), ul = null;
      content.split(/\r?\n/).forEach(function (line) {
        if (/^\s*-\s+/.test(line)) {
          if (!ul) { ul = el('ul'); box.appendChild(ul); }
          ul.appendChild(el('li', null, line.replace(/^\s*-\s+/, '')));
        } else if (line.trim()) {
          ul = null; box.appendChild(el('p', null, line));
        }
      });
      return box;
    }

    function showPost(id) {
      return call('GET', '/api/posts/' + id).then(function (d) {
        if (!view) { view = el('article', 'post live'); posts.appendChild(view); }
        view.textContent = '';
        var back = el('a', 'back', '← 목록으로'); back.href = '#list'; view.appendChild(back);
        if (!d.ok) { view.appendChild(el('p', null, d.error || '글을 불러오지 못했어요.')); }
        else {
          var p = d.post, head = el('header', 'post-head');
          head.appendChild(el('span', 'badge ' + p.category, CAT[p.category]));
          head.appendChild(el('h2', null, p.title));
          var meta = el('p', 'post-meta');
          meta.appendChild(el('span', null, p.author)); meta.appendChild(el('span', null, full(p.created_at))); meta.appendChild(el('span', null, '조회 ' + p.views));
          head.appendChild(meta); view.appendChild(head); view.appendChild(body(p.content));
        }
        view.hidden = false;
        page.classList.add('live-view');
        window.scrollTo(0, 0);
      });
    }

    function route() {
      var m = /^#post-(\d+)$/.exec(location.hash);
      return m ? showPost(m[1]) : showList();
    }

    ready.then(function (ok) {
      if (!ok) return; /* 서버가 없으면 HTML 속 예시 글을 그대로 둬요 */
      posts.textContent = ''; /* 예시 글 제거 (서버 글로 대체) */
      setNotice([t('글은 '), b('서버(D1 데이터베이스)'), t('에 저장돼요. 글을 누르면 내용을 볼 수 있고, '), b('글쓰기'), t('로 새 글을 올릴 수 있어요.')]);
      window.addEventListener('hashchange', route);
      route();
    });
  }

  /* ================= 폼 공통 ================= */
  function msgBox(form) {
    var m = $('.form-msg', form);
    return function (text, kind) { m.hidden = !text; m.textContent = text || ''; m.className = 'form-msg' + (kind ? ' ' + kind : ''); };
  }

  function wire(formSel, notice, send) {
    var form = $(formSel);
    if (!form) return;
    var say = msgBox(form), btn = $('button[type=submit]', form);
    ready.then(function (ok) { if (ok) setNotice(notice); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ready.then(function (ok) {
        if (!ok) { location.href = form.getAttribute('action'); return; } /* 서버가 없으면 연습용 안내 화면으로 */
        say('');
        btn.disabled = true;
        send(say).catch(function () { say('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error'); })
          .then(function () { btn.disabled = false; });
      });
    });
  }
  var v = function (id) { return document.getElementById(id).value; };

  /* ================= 글쓰기 ================= */
  wire('.write-form[action^="write.html"]',
    [t('글을 쓰면 '), b('서버에 저장'), t('되고 게시판에 바로 보여요.')],
    function (say) {
      return call('POST', '/api/posts', { category: v('w-cat'), author: v('w-name'), title: v('w-title'), content: v('w-body') })
        .then(function (d) {
          if (d.ok) { say('등록했어요!', 'ok'); location.href = 'board.html#post-' + d.id; }
          else say(d.error || '등록하지 못했어요.', 'error');
        });
    });

  /* ================= 회원가입 ================= */
  wire('.write-form[action^="signup.html"]',
    [t('가입 정보는 '), b('서버에 저장'), t('돼요. 비밀번호는 암호화(해시)해서 저장하고 원문은 저장하지 않아요. 연습용이니 실제 주소는 입력하지 않아도 돼요.')],
    function (say) {
      return call('POST', '/api/signup', {
        nickname: v('s-nick'), gender: v('s-gender'), email: v('s-email'), password: v('s-pw'),
        zipcode: v('s-zip'), address1: v('s-addr1'), address2: v('s-addr2'), agree: document.getElementById('s-agree').checked
      }).then(function (d) {
        if (d.ok) { say('가입이 완료됐어요! 로그인 화면으로 이동해요.', 'ok'); setTimeout(function () { location.href = 'login.html'; }, 1200); }
        else say(d.error || '가입하지 못했어요.', 'error');
      });
    });

  /* ================= 로그인 ================= */
  wire('.write-form[action^="login.html"]',
    [t('이메일과 비밀번호를 '), b('서버에서 확인'), t('해요. 로그인 상태 유지는 아직 지원하지 않아요.')],
    function (say) {
      return call('POST', '/api/login', { email: v('l-email'), password: v('l-pw') }).then(function (d) {
        if (d.ok) say(d.nickname + '님, 로그인 정보가 확인됐어요. (로그인 상태 유지는 아직 지원하지 않아요.)', 'ok');
        else say(d.error || '로그인하지 못했어요.', 'error');
      });
    });

  initBoard();
})();
