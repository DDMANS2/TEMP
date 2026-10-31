(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');

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
