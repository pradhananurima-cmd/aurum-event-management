/* =====================================================================
   AURUM · js/effects.js
   ---------------------------------------------------------------------
   Hand-written motion engine. No GSAP, no Lenis, no jQuery — everything
   here is built on requestAnimationFrame, CSS custom properties and
   IntersectionObserver so it works offline from a plain GitHub Pages
   bucket.

   Modules
     A. shared rAF ticker + math helpers
     B. inertial smooth scrolling            (signature)
     C. scroll progress + sticky header + section spy
     D. scroll reveals / line-mask hero title
     E. count-up numbers + scramble text
     F. parallax (hero backdrop, gallery art)
     G. 3D card tilt + pointer spotlight
     H. magnetic buttons + custom cursor
     I. aurora that follows the pointer
     J. canvas confetti burst
   Everything degrades through prefers-reduced-motion.
   ===================================================================== */

'use strict';

const FX = (() => {

  /* ---------------- A · helpers ---------------------------------- */
  const mq = q => window.matchMedia(q).matches;
  const REDUCE = mq('(prefers-reduced-motion: reduce)');
  const FINE   = mq('(pointer: fine)');
  const clamp  = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp   = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const subs = [];
  let running = false;
  function tick(fn) { subs.push(fn); if (!running) { running = true; requestAnimationFrame(loop); } }
  function loop(t) {
    for (let i = 0; i < subs.length; i++) subs[i](t);
    requestAnimationFrame(loop);
  }
  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /* ---------------- B · inertial smooth scroll ------------------- */
  const smooth = { on: false, target: 0, current: 0, driving: false, ease: 0.115 };

  function initSmooth() {
    if (REDUCE || !FINE) return;
    smooth.on = true;
    smooth.target = smooth.current = window.scrollY;

    window.addEventListener('wheel', e => {
      if (e.target && e.target.closest && e.target.closest('.lb, .pass')) return;   // overlays keep their own scroll
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal gesture → leave alone
      if (e.ctrlKey) return;                               // pinch-zoom
      e.preventDefault();
      const mult = e.deltaMode === 1 ? 18 : (e.deltaMode === 2 ? window.innerHeight : 1);
      smooth.target = clamp(smooth.target + e.deltaY * mult, 0, maxScroll());
    }, { passive: false });

    window.addEventListener('scroll', () => {
      if (smooth.driving) return;
      smooth.target = smooth.current = window.scrollY;     // re-sync after keyboard / scrollbar / resize
    }, { passive: true });

    tick(() => {
      if (!smooth.on) return;
      const d = smooth.target - smooth.current;
      if (Math.abs(d) < 0.5) {
        if (smooth.current !== smooth.target) { smooth.current = smooth.target; window.scrollTo(0, smooth.current); }
        smooth.driving = false;
        return;
      }
      smooth.driving = true;
      smooth.current = lerp(smooth.current, smooth.target, smooth.ease);
      window.scrollTo(0, smooth.current);
    });
  }

  /** Animated scroll to an element — used by every in-page link. */
  function scrollTo(el, offset) {
    if (!el) return;
    const pad = offset == null ? (document.querySelector('.hdr')?.offsetHeight || 0) + 14 : offset;
    const top = clamp(el.getBoundingClientRect().top + window.scrollY - pad, 0, maxScroll());
    if (!smooth.on) { window.scrollTo({ top, behavior: REDUCE ? 'auto' : 'smooth' }); return; }
    smooth.target = top;
  }

  /* ---------------- C · chrome driven by scroll ------------------ */
  function initChrome() {
    const bar   = document.getElementById('scrollBar');
    const hdr   = document.getElementById('hdr');
    let lastStuck = false;
    tick(() => {
      const y = window.scrollY;
      const p = maxScroll() > 0 ? y / maxScroll() : 0;
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      const stuck = y > 24;
      if (hdr && stuck !== lastStuck) { hdr.classList.toggle('is-stuck', stuck); lastStuck = stuck; }
    });
    initSpy();
  }

  /** FEATURE 7 — highlight the nav link of the section in view. */
  function initSpy() {
    const sections = document.querySelectorAll('main section[id]');
    const links = document.querySelectorAll('.nav__link, .sheet__nav a');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const id = '#' + en.target.id;
        links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------------- D · reveals + masked lines ------------------- */
  let revealIO = null;
  function initReveals() {
    if (REDUCE) { document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in')); return; }
    revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((en, i) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.transitionDelay = (i * 70) + 'ms';
        el.classList.add('in');
        obs.unobserve(el);
        setTimeout(() => { el.style.transitionDelay = ''; }, 1200);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    observeReveals();
  }
  function observeReveals() {
    if (!revealIO) { document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in')); return; }
    document.querySelectorAll('[data-reveal]:not(.in)').forEach(el => revealIO.observe(el));
  }

  /** Split a node's words into per-word spans and slide them up. */
  function splitWords(el) {
    const text = (el.dataset.text || el.textContent).trim();
    el.innerHTML = text.split(' ').map((w, i) =>
      `<span class="w" style="transition-delay:${i * 55}ms">${w}</span>`).join(' ');
    return el;
  }

  function initHeroTitle() {
    const title = document.getElementById('heroTitle');
    if (!title) return;
    const lines = title.querySelectorAll('.line');
    lines.forEach((ln, i) => setTimeout(() => ln.classList.add('is-up'), 120 + i * 130));
  }

  /* ---------------- E · counters + scramble ---------------------- */
  function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    if (REDUCE) { nums.forEach(n => { n.textContent = n.dataset.count + (n.dataset.suffix || ''); }); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        countTo(en.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(n => io.observe(n));
  }
  function countTo(el) {
    const to = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1500 + Math.min(700, to * 2);
    const t0 = performance.now();
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = Math.round(to * easeOutExpo(p)).toLocaleString('en-IN') + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  /** Re-run a count-up when the data changes (e.g. seats after a sign-up). */
  function recount(el, value) {
    el.dataset.count = value;
    el.dataset.done = '1';
    countTo(el);
  }

  const GLYPHS = '▚▞◣◢/\\|<>{}[]#*+=—·0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function initScramble() {
    const nodes = document.querySelectorAll('[data-scramble]');
    if (!nodes.length) return;
    if (REDUCE) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => { if (en.isIntersecting) { obs.unobserve(en.target); scramble(en.target); } });
    }, { threshold: 0.6 });
    nodes.forEach(n => io.observe(n));
  }
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    const len = final.length;
    const settle = final.split('').map((_, i) => 6 + i * 1.9);
    let frame = 0;
    const id = setInterval(() => {
      let out = '';
      for (let i = 0; i < len; i++) {
        if (final[i] === ' ') { out += ' '; continue; }
        out += frame > settle[i] ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (++frame > settle[settle.length - 1] + 2) { clearInterval(id); el.textContent = final; }
    }, 34);
  }

  /* ---------------- F · parallax --------------------------------- */
  function initParallax() {
    if (REDUCE) return;
    const speeds = [...document.querySelectorAll('[data-speed]')];
    const rails = [...document.querySelectorAll('[data-parallax]')];
    if (!speeds.length && !rails.length) return;
    tick(() => {
      const vh = window.innerHeight;
      for (const el of speeds) {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - vh / 2;
        el.style.setProperty('--par', (mid * -parseFloat(el.dataset.speed)).toFixed(2));
      }
      for (const img of rails) {
        const r = img.getBoundingClientRect();
        const rel = clamp((r.left + r.width / 2 - vh * 0) / window.innerWidth, -1.4, 1.4);
        const shift = clamp(rel * -14 * (parseFloat(img.dataset.parallax) * 10), -16, 16);
        img.style.setProperty('--px', shift.toFixed(2));
      }
    });
  }

  /* ---------------- G · tilt + spotlight ------------------------- */
  function bindTilt() {
    if (!FINE || REDUCE) return;
    document.querySelectorAll('.card:not([data-tilt])').forEach(card => {
      card.dataset.tilt = '1';
      const MAX = 6.5;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - .5) * MAX * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y) * MAX * 2).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------------- H · magnetic buttons + cursor ---------------- */
  function initMagnetic() {
    if (!FINE || REDUCE) return;
    document.querySelectorAll('[data-cursor="magnetic"]:not([data-mag])').forEach(el => {
      el.dataset.mag = '1';
      el.classList.add('magnetic');
      const strength = 0.34;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate3d(${((e.clientX - r.left - r.width / 2) * strength).toFixed(2)}px, ${((e.clientY - r.top - r.height / 2) * strength).toFixed(2)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initCursor() {
    if (!FINE || REDUCE) return;
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    document.body.classList.add('has-cursor');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, visible = false;
    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; document.body.classList.add('has-cursor'); }
      const hit = e.target.closest('a, button, input, select, textarea, label, [data-cursor]');
      ring.classList.toggle('is-hover', !!hit);
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });
    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = ''; });
    tick(() => {
      rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)` +
        (ring.classList.contains('is-hover') ? ' scale(1.75)' : '');
    });
  }

  /* ---------------- I · aurora follow ---------------------------- */
  function initAurora() {
    const aur = document.getElementById('aurora');
    if (!aur || REDUCE) return;
    let tx = 0, ty = 0, x = 0, y = 0;
    window.addEventListener('pointermove', e => {
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });
    tick(() => {
      x = lerp(x, tx, .05); y = lerp(y, ty, .05);
      aur.style.setProperty('--mx', x.toFixed(4));
      aur.style.setProperty('--my', y.toFixed(4));
    });
  }

  /* ---------------- J · confetti ---------------------------------- */
  /* Runs inside the shared rAF ticker (not a private rAF chain) so it can
     never stall with fragments stuck on screen, and integrates with dt so
     the burst falls at the same speed on a 60 Hz and a 144 Hz display. */
  let cvs, ctx, parts = [], last = 0, cleared = true;
  function initConfetti() {
    cvs = document.getElementById('confetti');
    if (!cvs) return;
    ctx = cvs.getContext('2d', { alpha: true });
    const size = () => { cvs.width = innerWidth * devicePixelRatio; cvs.height = innerHeight * devicePixelRatio; cleared = true; };
    size();
    addEventListener('resize', size);
    last = performance.now();
    tick(drawConfetti);
  }
  function burst(x, y, count) {
    if (REDUCE || !ctx) return;
    const cs = getComputedStyle(document.documentElement);
    const colours = ['--gold', '--mint', '--violet', '--rose', '--azure']
      .map(v => cs.getPropertyValue(v).trim() || '#e8c88a');
    const dpr = devicePixelRatio;
    const n = count || 120;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 220 + Math.random() * 640;                 // px/s
      parts.push({
        x: x * dpr, y: y * dpr,
        vx: Math.cos(a) * sp * dpr, vy: Math.sin(a) * sp * dpr - 620 * dpr,
        w: (4 + Math.random() * 8) * dpr, h: (6 + Math.random() * 10) * dpr,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * 14,
        c: colours[(Math.random() * colours.length) | 0], life: 1, shape: Math.random() > .55 ? 'r' : 'c'
      });
    }
    cleared = false;
  }
  function drawConfetti(now) {
    if (!ctx) return;
    if (!parts.length) {
      if (!cleared) { ctx.clearRect(0, 0, cvs.width, cvs.height); cleared = true; }
      last = now;
      return;
    }
    const dt = Math.min(.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const dpr = devicePixelRatio;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 2400 * dt * dpr;                                  // gravity
      p.vx *= (1 - 1.1 * dt); p.vy *= (1 - .5 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt * .42;
      if (p.life <= 0 || p.y > cvs.height + 60) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape === 'r') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
  }
  /** A thin celebratory line of confetti fired from an element's centre. */
  function burstFrom(el, count) {
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, count);
  }

  /* ---------------- window resize re-flow ------------------------ */
  function refresh() {
    if (smooth.on) { smooth.target = clamp(smooth.target, 0, maxScroll()); }
  }

  function init() {
    initSmooth();
    initChrome();
    initReveals();
    initHeroTitle();
    initCounters();
    initScramble();
    initParallax();
    initConfetti();
    initCursor();
    initAurora();
    bindTilt();
    initMagnetic();
    window.addEventListener('resize', refresh);
  }

  return {
    init, scrollTo, observeReveals, bindTilt, initMagnetic, splitWords,
    scramble, recount, burst, burstFrom, maxScroll, REDUCE, FINE, lerp, clamp
  };
})();
