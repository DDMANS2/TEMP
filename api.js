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

  /* ---------- 로그인한 회원 확인 (서버가 있을 때만) ---------- */
  var me = ready.then(function (ok) {
    if (!ok) return null;
    return fetch('/api/me', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && d.user ? d.user : null; })
      .catch(function () { return null; });
  });

  /* 로그인 후 돌아갈 곳 (같은 사이트의 정해진 화면만 허용) */
  var nextPage = function () {
    var m = /[?&]next=([a-z]+\.html)\b/.exec(location.search);
    return m && ['write.html', 'board.html'].indexOf(m[1]) > -1 ? m[1] : 'board.html';
  };

  /* ---------- 헤더: 로그인 ↔ 닉네임·로그아웃 / 글쓰기 버튼 ---------- */
  Promise.all([ready, me]).then(function (r) {
    if (!r[0]) return; /* 서버가 없으면 그대로 */
    var user = r[1], link = $('.nav a[href="login.html"]');
    if (user && link) {
      link.textContent = user.nickname + '님';
      link.href = 'board.html';
      link.removeAttribute('aria-current');
      var out = el('a', null, '로그아웃'); out.href = '#logout';
      out.addEventListener('click', function (e) {
        e.preventDefault();
        call('POST', '/api/logout', {}).then(function () { location.href = 'index.html'; });
      });
      link.parentNode.insertBefore(out, link.nextSibling);
    }
    if (!user) { /* 로그인 전: 글쓰기 버튼을 잠가요 (눌러도 글쓰기 화면이 아니라 로그인 화면으로 가요) */
      var w = document.querySelectorAll('a.btn[href="write.html"]');
      for (var i = 0; i < w.length; i++) {
        w[i].href = 'login.html?next=write.html';
        w[i].classList.add('is-locked');
        w[i].setAttribute('aria-disabled', 'true');
        w[i].title = '로그인한 뒤에 글을 쓸 수 있어요';
        w[i].textContent = '🔒 로그인 후 글쓰기';
      }
      if ($('.board-page')) setNotice([t('팬들이 올린 글을 볼 수 있어요. '), b('글쓰기는 로그인한 회원만'), t(' 할 수 있어요.')]);
    }
  });

  function call(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: '응답을 읽을 수 없어요. 잠시 후 다시 시도해 주세요.' }; })
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
      setNotice([t('팬들이 올린 글을 볼 수 있어요. 글을 누르면 내용이 보이고, '), b('글쓰기'), t('로 새 글을 올릴 수 있어요.')]);
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
        send(say).catch(function () { say('연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error'); })
          .then(function () { btn.disabled = false; });
      });
    });
  }
  var v = function (id) { return document.getElementById(id).value; };

  /* ================= 글쓰기 (로그인한 회원만) ================= */
  (function gateWrite() {
    var form = $('.write-form[action^="write.html"]');
    if (!form) return;
    Promise.all([ready, me]).then(function (r) {
      if (!r[0]) return; /* 서버가 없으면 연습용 화면 그대로 */
      if (r[1]) { /* 로그인함: 닉네임은 로그인 정보로 자동 입력, 바꿀 수 없음 */
        var n = document.getElementById('w-name');
        n.value = r[1].nickname; n.readOnly = true;
        return;
      }
      var box = el('div', 'write-done'); box.id = 'need-login'; box.style.display = 'block';
      box.appendChild(el('p', 'eyebrow', 'LOGIN'));
      box.appendChild(el('h2', null, '로그인한 뒤에 글을 쓸 수 있어요'));
      box.appendChild(el('p', null, '게시판 글쓰기는 회원만 할 수 있어요. 로그인하거나, 아직 회원이 아니라면 가입해 주세요.'));
      var cta = el('div', 'cta');
      var a1 = el('a', 'btn primary', '로그인'); a1.href = 'login.html?next=write.html';
      var a2 = el('a', 'btn ghost', '회원가입'); a2.href = 'signup.html';
      cta.appendChild(a1); cta.appendChild(a2); box.appendChild(cta);
      form.parentNode.insertBefore(box, form);
      form.hidden = true; form.style.display = 'none'; /* CSS의 display가 hidden을 이기지 않게 */
      var nt = $('.board-notice'); if (nt) nt.hidden = true;
    });
  })();

  wire('.write-form[action^="write.html"]',
    [t('쓴 글은 '), b('게시판에 바로 올라가요.'), t(' 작성자는 로그인한 닉네임으로 표시돼요. 다른 방문자도 볼 수 있으니 개인정보는 적지 말아 주세요.')],
    function (say) {
      return call('POST', '/api/posts', { category: v('w-cat'), title: v('w-title'), content: v('w-body') })
        .then(function (d) {
          if (d.ok) { say('등록했어요!', 'ok'); location.href = 'board.html#post-' + d.id; }
          else if (d.status === 401) say('로그인이 풀렸어요. 다시 로그인해 주세요.', 'error');
          else say(d.error || '등록하지 못했어요.', 'error');
        });
    });

  /* ================= 회원가입 ================= */
  wire('.write-form[action^="signup.html"]',
    [t('입력한 정보는 '), b('회원 정보로 저장'), t('돼요. 비밀번호는 암호화해서 보관하고, 원래 비밀번호는 저장하지 않아요. 연습용 사이트이니 실제 이메일·주소 대신 임의의 값을 써도 돼요.')],
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
    [t('가입한 이메일과 비밀번호를 입력해 주세요. 로그인하면 '), b('7일 동안'), t(' 로그인 상태가 유지돼요.')],
    function (say) {
      return call('POST', '/api/login', { email: v('l-email'), password: v('l-pw') }).then(function (d) {
        if (d.ok) { say(d.nickname + '님, 로그인했어요!', 'ok'); setTimeout(function () { location.href = nextPage(); }, 700); }
        else say(d.error || '로그인하지 못했어요.', 'error');
      });
    });

  initBoard();
})();
