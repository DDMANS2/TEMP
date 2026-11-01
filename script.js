(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');

  /* 주소창에 #done 을 직접 붙여 들어온 경우(폼을 제출한 적 없음)에는 안내 화면 대신 입력 화면을 보여요.
     연습용 화면에서 실제로 제출해서 넘어온 경우는 같은 페이지에서 왔으므로(referrer) 그대로 안내를 보여줘요. */
  if (location.hash === '#done') {
    var from = doc.referrer ? doc.referrer.split('#')[0].replace(/[?].*$/, '') : '';
    var here = location.href.split('#')[0].replace(/[?].*$/, '');
    if (from !== here) doc.documentElement.classList.add('fresh');
  }
  /* 같은 화면에서 주소창으로 #done 만 바꿔 들어온 경우도 직접 접근으로 봐요 (실제 제출은 새로 불러오기라 해당 없음) */
  var submitted = false; /* 이 화면에서 폼을 제출했는지 (제출 후 #done 으로 넘어가는 것은 정상) */
  doc.addEventListener('submit', function () { submitted = true; }, true);
  window.addEventListener('hashchange', function () {
    doc.documentElement.classList.toggle('fresh', location.hash === '#done' && !submitted);
  });

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: 스크롤 시 배경, 모바일 메뉴 ---------- */
  var header = doc.querySelector('.site-header');
  var menuBtn = doc.getElementById('menuBtn');
  var nav = doc.getElementById('nav');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }
  menuBtn.addEventListener('click', function () {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------- 현재 페이지 메뉴 강조 ---------- */
  // 각 HTML에 aria-current="page"가 들어 있지만, 빠진 경우를 대비해 주소로 한 번 더 맞춘다.
  var current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  if (!nav.querySelector('[aria-current="page"]')) {
    links.forEach(function (a) {
      if (a.getAttribute('href').toLowerCase() === current) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- 스크롤 등장 효과 ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 80 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 숫자 카운트업 ---------- */
  function format(n, plain) { return plain ? String(n) : n.toLocaleString('en-US'); }

  function countUp(el) {
    var target = Number(el.dataset.target);
    var prefix = el.dataset.prefix || '';
    var plain = el.dataset.plain === 'true'; // 연도처럼 쉼표가 필요 없는 값
    if (reduceMotion) { el.textContent = prefix + format(target, plain); return; }
    var duration = 1600;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + format(Math.round(target * eased), plain);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = doc.querySelectorAll('.count');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(function (c) {
      c.textContent = (c.dataset.prefix || '') + format(Number(c.dataset.target), c.dataset.plain === 'true');
    });
  }

  /* ---------- 충전 시간 계산기 ---------- */
  // 기준: 15% → 85% 구간(70%p)에 약 10분 (임원 발언). 단순 선형 계산.
  var MIN_PER_PERCENT = 10 / 70;

  var fromRange = doc.getElementById('fromRange');
  var toRange = doc.getElementById('toRange');
  var fromOut = doc.getElementById('fromOut');
  var toOut = doc.getElementById('toOut');
  var timeOut = doc.getElementById('timeOut');
  var barFill = doc.getElementById('barFill');

  function updateCalc(changed) {
    var from = Number(fromRange.value);
    var to = Number(toRange.value);

    // 시작값이 목표값보다 커지지 않도록 서로 밀어준다
    if (from >= to) {
      if (changed === 'from') { to = Math.min(from + 5, 100); from = to - 5; }
      else { from = Math.max(to - 5, 0); to = from + 5; }
      fromRange.value = from;
      toRange.value = to;
    }

    fromOut.textContent = from;
    toOut.textContent = to;
    barFill.style.left = from + '%';
    barFill.style.width = (to - from) + '%';

    var minutes = (to - from) * MIN_PER_PERCENT;
    var text;
    if (minutes < 1) text = '1분 미만';
    else text = '약 ' + Math.round(minutes) + '분';
    timeOut.textContent = text;
  }

  // 계산기는 charging.html에만 있으므로 있을 때만 연결한다
  if (fromRange && toRange) {
    fromRange.addEventListener('input', function () { updateCalc('from'); });
    toRange.addEventListener('input', function () { updateCalc('to'); });
    updateCalc();
  }

  /* ---------- 공식 영상: 누를 때만 불러오기 ---------- */
  var videoPlay = doc.getElementById('videoPlay');
  if (videoPlay) {
    videoPlay.addEventListener('click', function () {
      var id = videoPlay.dataset.videoId;
      // PC에서 파일로 바로 연 경우(file://)에는 유튜브 퍼가기가 막히므로 유튜브로 연다
      if (location.protocol === 'file:') {
        window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener');
        return;
      }
      var iframe = doc.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'Tesla 공식 영상: Roadster Event';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      videoPlay.replaceWith(iframe);
    });
  }

  /* ---------- FAQ: 하나만 열리게 ---------- */
  var details = doc.querySelectorAll('.faq details');
  details.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      details.forEach(function (other) {
        if (other !== d) other.open = false;
      });
    });
  });
})();
