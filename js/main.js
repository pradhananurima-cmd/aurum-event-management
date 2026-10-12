/* =====================================================================
   AURUM · js/main.js
   ---------------------------------------------------------------------
   FEATURE MAP  (everything the assignment asks for, and where it lives)
     1  Dynamic event rendering ................. renderEventGrid()
     2  Category filtering + FLIP reflow ......... filterEvents()
     3  Live countdown to the next event ........ updateCountdown()
     4  Digital clock (Asia/Kolkata) + dial ..... updateClock()
     5  Dark / light mode, remembered ........... initTheme()
     6  Registration form — 3 steps, validated .. initWizard()
     7  Saved passes in localStorage ............ renderPasses()
     8  Feedback form validation + counter ....... initFeedback()
     9  Gallery rail: drag, arrows, lightbox ..... initRail()
     10 Mobile navigation + smooth anchors ....... initNav()
     11 Ticker, hero facts, stat counters ........ renderTicker()
   ===================================================================== */

'use strict';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = n => String(n).padStart(2, '0');

const ICON = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.7 7-11a7 7 0 10-14 0c0 5.3 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>'
};

/* =====================================================================
   1 · RENDER EVENTS  (data → DOM)
   ===================================================================== */
const grid = $('#eventGrid');
const emptyNote = $('#eventEmpty');

function eventCard(ev, index) {
  const d = formatDateParts(ev.date);
  const cat = CATEGORIES[ev.category] || { label: 'Event' };
  const filled = Math.round((ev.registered / ev.capacity) * 100);
  const left = Math.max(0, ev.capacity - ev.registered);
  const perks = (ev.perks || []).slice(0, 3)
    .map(p => `<span class="pill">${p}</span>`).join('');

  return `
  <li class="card" data-category="${ev.category}" data-id="${ev.id}" style="--i:${index}">
    <div class="card__art">
      <img src="${ev.art}" alt="${ev.name}" loading="lazy" decoding="async">
      <div class="card__date"><b>${d.day}</b><span>${d.month}</span></div>
      <span class="card__tag" data-accent="${cat.accent}">${cat.label}</span>
      <span class="card__idx" aria-hidden="true">${pad(index + 1)}</span>
    </div>
    <div class="card__body">
      <h3>${ev.name}</h3>
      <p class="card__when">${ICON.cal}<span>${d.weekday}, ${d.full} · ${d.time}</span></p>
      <p class="card__where">${ICON.pin}<span>${ev.venue} · ${ev.mode}</span></p>
      <p class="card__desc">${ev.description}</p>
      <div class="card__meta">
        <span class="pill"><b>${ev.hours} h</b>long</span>
        <span class="pill">fee <b>${formatFee(ev.fee)}</b></span>
        ${perks}
      </div>
      <div class="card__seats" data-seats>
        <div class="card__seats-row">
          <span>${left > 0 ? left + ' seats left' : 'waitlist only'}</span>
          <span>${ev.registered}/${ev.capacity} registered</span>
        </div>
        <div class="card__bar"><i data-bar style="width:${filled}%"></i></div>
      </div>
      <div class="card__foot">
        <span class="card__fee">${formatFee(ev.fee)}</span>
        <button type="button" class="card__go" data-pick="${ev.id}">Register ${ICON.arrow}</button>
      </div>
    </div>
  </li>`;
}

function renderEventGrid() {
  const list = sortedEvents();
  grid.innerHTML = list.map(eventCard).join('');

  // animate the seat bars once the cards are on screen
  requestAnimationFrame(() => {
    $$('[data-bar]').forEach(bar => {
      const w = bar.style.width; bar.style.width = '0';
      requestAnimationFrame(() => { bar.style.width = w; });
    });
  });

  // registration <select> + step-2 picker, both from the same array
  const sel = $('#eventSelect');
  const picker = $('#eventPicker');
  sel.innerHTML = '<option value="">Select an event</option>' + list.map(ev => {
    const d = formatDateParts(ev.date);
    return `<option value="${ev.id}">${ev.name} — ${d.day} ${d.month}, ${d.time}</option>`;
  }).join('');
  picker.innerHTML = list.map(ev => {
    const d = formatDateParts(ev.date);
    return `<button type="button" class="pick" role="option" aria-selected="false" data-pick="${ev.id}">
      <b>${ev.name}</b><span>${d.weekday} ${d.short} · ${d.time}</span><span>${ev.venue}</span></button>`;
  }).join('');

  // category counts on the filter chips
  const counts = { all: list.length };
  list.forEach(ev => { counts[ev.category] = (counts[ev.category] || 0) + 1; });
  $$('.chip').forEach(chip => {
    const key = chip.dataset.filter;
    const badge = $('i', chip);
    if (badge) badge.textContent = counts[key] || 0;
  });

  // stagger the cards in as they enter the viewport
  if ('IntersectionObserver' in window && !FX.REDUCE) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    $$('.card', grid).forEach(c => io.observe(c));
  } else {
    $$('.card', grid).forEach(c => c.classList.add('is-in'));
  }

  FX.bindTilt();
  FX.initMagnetic();
  return list;
}

/* =====================================================================
   2 · FILTERING (FLIP: First-Last-Invert-Play)
   ===================================================================== */
const filters = $('.filters');
const indicator = $('#filterInd');

function moveIndicator() {
  const active = $('.chip.is-active', filters);
  if (!active || !indicator) return;
  // chips wrap on small screens, so the pill tracks x, y, w and h
  indicator.style.setProperty('--x', (active.offsetLeft - filters.clientLeft) + 'px');
  indicator.style.setProperty('--y', (active.offsetTop - filters.clientTop) + 'px');
  indicator.style.setProperty('--w', active.offsetWidth + 'px');
  indicator.style.setProperty('--h', active.offsetHeight + 'px');
}

function filterEvents(cat) {
  const cards = $$('.card', grid);
  const before = new Map(cards.map(c => [c, c.getBoundingClientRect()]));

  let visible = 0;
  cards.forEach(c => {
    const show = cat === 'all' || c.dataset.category === cat;
    c.classList.toggle('is-hidden', !show);
    if (show) visible++;
  });
  emptyNote.hidden = visible > 0;

  if (!FX.REDUCE) {
    cards.forEach(c => {
      if (c.classList.contains('is-hidden')) return;
      const a = before.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.style.transition = 'none';
      c.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      c.dataset.flip = '1';
    });
    requestAnimationFrame(() => {
      cards.forEach(c => {
        if (c.dataset.flip !== '1') return;
        c.style.transition = 'transform 560ms cubic-bezier(.22,1,.36,1)';
        c.style.transform = '';
        setTimeout(() => { c.style.transition = ''; delete c.dataset.flip; c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }, 580);
      });
    });
  }
  // nudge the seat bars so a re-shuffled grid feels alive
  $$('[data-bar]:not(.is-hidden)', grid).forEach(bar => {
    const w = bar.style.width;
    bar.style.width = '0';
    requestAnimationFrame(() => { bar.style.width = w; });
  });
}

filters.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  $$('.chip', filters).forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
  chip.classList.add('is-active');
  chip.setAttribute('aria-pressed', 'true');
  moveIndicator();
  filterEvents(chip.dataset.filter);
});
window.addEventListener('resize', moveIndicator);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

/* =====================================================================
   3 + 4 · COUNTDOWN, CLOCK, DIAL
   ===================================================================== */
const cd = {
  title: $('#cdTitle'), meta: $('#cdMeta'),
  d: $('#cdDays'), h: $('#cdHours'), m: $('#cdMins'), s: $('#cdSecs')
};
let cdTarget = null;

function pickNextEvent() {
  const now = Date.now();
  cdTarget = sortedEvents().find(ev => new Date(ev.date).getTime() > now) || null;
  if (!cdTarget) {
    cd.title.textContent = 'No upcoming events';
    cd.meta.textContent = 'The calendar reopens next semester.';
    return;
  }
  const d = formatDateParts(cdTarget.date);
  cd.title.textContent = cdTarget.name;
  cd.meta.textContent = `${d.full} · ${d.time} · ${cdTarget.venue}`;
}

function setFlip(el, value) {
  if (el.textContent === value) return;
  el.textContent = value;
  el.classList.remove('is-flip');
  void el.offsetWidth;                 // restart the CSS flip animation
  el.classList.add('is-flip');
}

function updateCountdown() {
  if (!cdTarget) return;
  let diff = new Date(cdTarget.date).getTime() - Date.now();
  if (diff < 0) { pickNextEvent(); tickClock(); return; }
  const day = Math.floor(diff / 86400000); diff -= day * 86400000;
  const hr  = Math.floor(diff / 3600000);  diff -= hr * 3600000;
  const mi  = Math.floor(diff / 60000);    diff -= mi * 60000;
  const se  = Math.floor(diff / 1000);
  setFlip(cd.d, pad(day)); setFlip(cd.h, pad(hr)); setFlip(cd.m, pad(mi)); setFlip(cd.s, pad(se));
}

const clockEl = $('#clock');
const dialHand = $('#dialHand');
function tickClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('en-IN', {
    timeZone: IST, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const secs = now.toLocaleTimeString('en-IN', { timeZone: IST, second: '2-digit' });
  if (dialHand) dialHand.setAttribute('transform', `rotate(${(parseInt(secs, 10) % 60) * 6} 22 22)`);
}

/* =====================================================================
   5 · THEME
   ===================================================================== */
const THEME_KEY = 'aurum.theme.v1';
const themeBtn = $('#themeBtn');

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0a0b0f' : '#f7f4ec');
  themeBtn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  try { localStorage.setItem(THEME_KEY, mode); } catch (_) {}
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    const r = themeBtn.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, next === 'dark' ? 26 : 18);
  });
}

/* =====================================================================
   6 · MULTI-STEP REGISTRATION FORM + VALIDATION
   ===================================================================== */
const RULES = {
  name:    { re: /^[A-Za-z][A-Za-z .'-]{1,59}$/,      msg: 'Letters, spaces, dots and apostrophes only (2–60 characters).' },
  roll:    { re: /^\d{10}$/,                            msg: 'IEM roll number is exactly 10 digits.' },
  email:   { re: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,    msg: 'Enter a valid email address, e.g. name@iem.edu.in.' },
  phone:   { re: /^[6-9]\d{9}$/,                        msg: 'Enter a valid 10-digit Indian mobile number.' },
  message: { min: 15,                                  msg: 'At least 15 characters, please.' }
};
const PASS_KEY = 'aurum.passes.v1';

const regForm = $('#regForm');
const regStatus = $('#regStatus');
const steps = $$('#steps li');
const panels = $$('.step', regForm);
const meter = $('#stepMeter');
const nextBtn = $('#nextBtn');
const submitBtn = $('#submitBtn');
const backBtn = $('#backBtn');
let step = 1;
const LAST = panels.length;

function fieldOf(id) { const el = document.getElementById(id); return el ? el.closest('.field') : null; }

function mark(id, message) {
  const field = fieldOf(id);
  const err = document.getElementById('err-' + id);
  if (field) { field.classList.toggle('is-bad', Boolean(message)); field.classList.toggle('is-ok', !message); }
  if (err) err.textContent = message || '';
  return !message;
}

function validateInput(el) {
  const kind = el.dataset.rule;
  const value = el.value.trim();
  if (!kind) return true;
  if (kind === 'agree') return el.checked ? mark(el.id, '') : mark(el.id, 'Tick the box to submit your registration.');
  if (!value) return mark(el.id, 'This field is required.');
  const rule = RULES[kind];
  if (rule && rule.re && !rule.re.test(value)) return mark(el.id, rule.msg);
  if (rule && rule.min && value.length < rule.min) return mark(el.id, rule.msg);
  return mark(el.id, '');
}

function requiredField(el) {
  return el.value ? mark(el.id, '') : mark(el.id, el.dataset.required || 'This field is required.');
}

function validateStep(n) {
  let ok = true;
  if (n === 1) {
    ok = ['#studentName', '#rollNo', '#department', '#email', '#phone']
      .map(s => { const el = $(s); return el.tagName === 'SELECT' ? requiredField(el) : validateInput(el); })
      .every(Boolean);
    const gender = regForm.querySelector('input[name="gender"]:checked');
    ok = mark('gender', gender ? '' : 'Pick an option.') && ok;
  } else if (n === 2) {
    ok = requiredField($('#eventSelect'));
  } else {
    ok = validateInput($('#agree'));
  }
  return ok;
}

function paintSteps() {
  panels.forEach(p => {
    const on = Number(p.dataset.step) === step;
    p.hidden = !on;
    p.classList.remove('is-enter');
    if (on) { void p.offsetWidth; p.classList.add('is-enter'); }
  });
  steps.forEach((li, i) => {
    li.classList.toggle('is-active', i + 1 === step);
    li.classList.toggle('is-done', i + 1 < step);
    $('i', li).textContent = (i + 1 < step) ? '' : String(i + 1);
  });
  meter.style.width = (step / LAST * 100) + '%';
  backBtn.hidden = step === 1;
  nextBtn.hidden = step === LAST;
  submitBtn.hidden = step !== LAST;
  const first = $('input:not([type=checkbox]):not([type=radio]), select, textarea', panels[step - 1]);
  if (first && !FX.FINE) first.focus({ preventScroll: true });
}

function goTo(n) { step = FX.clamp(n, 1, LAST); paintSteps(); }

function status(text, kind) {
  regStatus.textContent = text;
  regStatus.classList.toggle('is-empty', !text);
  regStatus.classList.toggle('is-ok', kind === 'ok');
  regStatus.classList.toggle('is-bad', kind === 'bad');
}

function renderReview() {
  const box = $('#review');
  const ev = eventById($('#eventSelect').value);
  const d = ev ? formatDateParts(ev.date) : null;
  const rows = [
    ['Name',    $('#studentName').value.trim() || '—'],
    ['Roll no.', $('#rollNo').value.trim() || '—'],
    ['Department', $('#department').value || '—'],
    ['Email',   $('#email').value.trim() || '—'],
    ['Phone',   $('#phone').value.trim() ? '+91 ' + $('#phone').value.trim() : '—'],
    ['Team',    $('#teamName').value.trim() || 'Individual entry'],
    ['Event',   ev ? ev.name : '—'],
    ['When',    d ? `${d.full} · ${d.time}` : '—'],
    ['Venue',   ev ? ev.venue : '—'],
    ['Fee',     ev ? formatFee(ev.fee) : '—']
  ];
  box.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

function makePassId(ev) {
  const d = new Date(ev.date);
  const stamp = (d.getMonth() + 1) * 100 + d.getDate();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AUR-${stamp}-${rand}`;
}

function readPasses() {
  try { return JSON.parse(localStorage.getItem(PASS_KEY) || '[]'); } catch (_) { return []; }
}
function writePasses(list) {
  try { localStorage.setItem(PASS_KEY, JSON.stringify(list.slice(-12))); } catch (_) {}
}

function renderPasses() {
  const box = $('#savedBox'), list = $('#savedList');
  const passes = readPasses();
  box.hidden = !passes.length;
  list.innerHTML = passes.slice().reverse().map(p =>
    `<li><span>${p.name.split(' ')[0]} · ${p.event}</span><b>${p.id}</b>
      <button type="button" data-drop="${p.id}">cancel</button></li>`).join('');
}

function bumpSeats(id) {
  const ev = eventById(id);
  if (!ev) return;
  ev.registered = Math.min(ev.capacity, ev.registered + 1);
  const card = grid.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;
  const filled = Math.round((ev.registered / ev.capacity) * 100);
  $('[data-bar]', card).style.width = filled + '%';
  const rows = $$('.card__seats-row span', card);
  const left = Math.max(0, ev.capacity - ev.registered);
  if (rows[0]) rows[0].textContent = left > 0 ? left + ' seats left' : 'waitlist only';
  if (rows[1]) rows[1].textContent = `${ev.registered}/${ev.capacity} registered`;
}

function initWizard() {
  paintSteps();

  // live validation — once a field has been touched, fix it as you type
  regForm.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'phone' || el.id === 'rollNo') el.value = el.value.replace(/\D/g, '').slice(0, 10);
    if (el.dataset.rule && fieldOf(el.id)?.classList.contains('is-bad')) validateInput(el);
    if (el.name === 'gender') mark('gender', '');
    if (el.id === 'eventSelect') syncPicker();
  });
  regForm.addEventListener('change', e => {
    if (e.target.tagName === 'SELECT' && fieldOf(e.target.id)?.classList.contains('is-bad')) requiredField(e.target);
    if (e.target.id === 'eventSelect') syncPicker();
    if (e.target.id === 'agree' && e.target.checked) mark('agree', '');
  });

  nextBtn.addEventListener('click', () => {
    if (!validateStep(step)) {
      status('Some fields need attention — fix the highlighted ones to continue.', 'bad');
      const bad = $('.is-bad input, .is-bad select', regForm);
      if (bad) bad.focus({ preventScroll: false });
      return;
    }
    if (step === 2) renderReview();
    status('', 'idle');
    goTo(step + 1);
  });
  backBtn.addEventListener('click', () => { status('', 'idle'); goTo(step - 1); });

  // event picker on step 2 mirrors the <select>
  $('#eventPicker').addEventListener('click', e => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    $('#eventSelect').value = btn.dataset.pick;
    requiredField($('#eventSelect'));
    syncPicker();
    status('', 'idle');
  });

  // card "Register" buttons jump straight to step 2 with the event chosen
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    $('#eventSelect').value = btn.dataset.pick;
    requiredField($('#eventSelect'));
    syncPicker();
    goTo(2);
    FX.scrollTo($('#register'), 90);
    const sel = $('#eventSelect').closest('.field');
    sel.animate([{ transform: 'translateY(10px)', opacity: .4 }, { transform: 'none', opacity: 1 }],
      { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' });
  });

  regForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateStep(3) || !validateStep(2) || !validateStep(1)) {
      status('Something is missing — check the highlighted fields.', 'bad');
      return;
    }
    const ev = eventById($('#eventSelect').value);
    const roll = $('#rollNo').value.trim();
    const passes = readPasses();
    if (passes.some(p => p.roll === roll && p.eventId === ev.id)) {
      status(`Roll ${roll} is already registered for ${ev.name}. Cancel it below if that was a mistake.`, 'bad');
      goTo(1);
      return;
    }
    const pass = {
      id: makePassId(ev),
      name: $('#studentName').value.trim(),
      roll,
      department: $('#department').value,
      email: $('#email').value.trim(),
      eventId: ev.id,
      event: ev.name,
      venue: ev.venue,
      when: formatDateParts(ev.date).full + ' · ' + formatDateParts(ev.date).time,
      at: new Date().toISOString()
    };
    writePasses([...passes, pass]);
    openPass(pass);
    bumpSeats(ev.id);
    renderPasses();
    status(`Registered. Thanks ${pass.name.split(' ')[0]} — pass ${pass.id} is on its way to ${pass.email}.`, 'ok');
    regForm.reset();
    $$('.field', regForm).forEach(f => f.classList.remove('is-ok', 'is-bad'));
    syncPicker();
    goTo(1);
  });

  renderPasses();
  $('#savedList').addEventListener('click', e => {
    const btn = e.target.closest('[data-drop]');
    if (!btn) return;
    const keep = readPasses().filter(p => p.id !== btn.dataset.drop);
    writePasses(keep);
    renderPasses();
    status('Registration cancelled — your seat has been released.', 'idle');
  });
}

function syncPicker() {
  const value = $('#eventSelect').value;
  $$('#eventPicker .pick').forEach(b => {
    const on = b.dataset.pick === value;
    b.classList.toggle('is-sel', on);
    b.setAttribute('aria-selected', String(on));
  });
  if (value) renderReview();
}

/* --- pass / success modal --- */
const modal = $('#passModal');
let modalOpener = null;

function openPass(pass) {
  $('#passId').textContent = pass.id;
  $('#passName').textContent = pass.name;
  $('#passRoll').textContent = pass.roll;
  $('#passEvent').textContent = pass.event;
  $('#passVenue').textContent = pass.venue;
  $('#passWhen').textContent = pass.when;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-open'));
  document.body.classList.add('is-locked');
  modalOpener = document.activeElement;
  $('#passClose').focus({ preventScroll: true });
  const r = modal.querySelector('.pass__tick').getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + r.height / 2, 150);
}
function closePass() {
  modal.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => { modal.hidden = true; }, 320);
  if (modalOpener) modalOpener.focus({ preventScroll: true });
}
function initPassModal() {
  $('#passClose').addEventListener('click', closePass);
  modal.addEventListener('click', e => { if (e.target === modal) closePass(); });
  $('#passCopy').addEventListener('click', async () => {
    const id = $('#passId').textContent;
    const btn = $('#passCopy');
    try { await navigator.clipboard.writeText(id); }
    catch (_) {                                     // clipboard API needs https
      const t = document.createElement('textarea');
      t.value = id; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (__) {}
      t.remove();
    }
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy pass ID'; }, 1600);
  });
}

/* =====================================================================
   8 · FEEDBACK FORM
   ===================================================================== */
function initFeedback() {
  const form = $('#feedbackForm');
  const out = $('#fbStatus');
  const msg = $('#fbMessage');
  const count = $('#fbCount');

  msg.addEventListener('input', () => {
    const n = msg.value.trim().length;
    count.textContent = n;
    count.style.color = n >= RULES.message.min ? 'var(--ok)' : '';
    if (fieldOf('fbMessage')?.classList.contains('is-bad')) validateInput(msg);
  });
  ['fbName', 'fbEmail'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { if (fieldOf(id)?.classList.contains('is-bad')) validateInput(el); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = [validateInput($('#fbName')), validateInput($('#fbEmail')), validateInput(msg)].every(Boolean);
    out.classList.remove('is-empty');
    if (ok) {
      out.textContent = 'Feedback sent. Thank you — the coordinator desk reads every message.';
      out.classList.add('is-ok'); out.classList.remove('is-bad');
      form.reset();
      count.textContent = '0';
      $$('.field', form).forEach(f => f.classList.remove('is-ok', 'is-bad'));
      FX.burstFrom(e.submitter || form.querySelector('button'), 40);
    } else {
      out.textContent = 'Fix the highlighted fields and send again.';
      out.classList.add('is-bad'); out.classList.remove('is-ok');
    }
  });
}

/* =====================================================================
   9 · GALLERY RAIL — drag, arrows, progress, lightbox
   ===================================================================== */
function initRail() {
  const rail = $('#rail');
  const meterBar = $('#railMeter');   // the <i> IS the meter (see .rail-meter i)
  const frames = $$('.frame', rail);

  // small magnifier badge on each frame (created here, styled in CSS)
  frames.forEach(f => {
    if ($('.frame__zoom', f)) return;
    const b = document.createElement('span');
    b.className = 'frame__zoom';
    b.innerHTML = ICON.zoom;
    f.appendChild(b);
  });

  const stepSize = () => (frames[0]?.getBoundingClientRect().width || 320) + 20;
  const paint = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const ratio = Math.max(.05, rail.clientWidth / rail.scrollWidth);
    meterBar.style.width = (ratio * 100) + '%';
    const p = max > 0 ? rail.scrollLeft / max : 0;
    meterBar.style.transform = `translateX(${(p * (1 - ratio) / ratio * 100).toFixed(2)}%)`;
    $('#railPrev').disabled = rail.scrollLeft < 6;
    $('#railNext').disabled = rail.scrollLeft > max - 6;
  };
  rail.addEventListener('scroll', paint, { passive: true });
  window.addEventListener('resize', paint);
  paint();

  $('#railPrev').addEventListener('click', () => rail.scrollBy({ left: -stepSize(), behavior: 'smooth' }));
  $('#railNext').addEventListener('click', () => rail.scrollBy({ left: stepSize(), behavior: 'smooth' }));

  // pointer drag with click suppression past a 6px threshold
  let drag = null;
  let hitFrame = null;              // frame under the pointer when the drag began
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    hitFrame = e.target.closest('.frame');
    drag = { x: e.clientX, left: rail.scrollLeft, moved: 0 };
    rail.classList.add('is-dragging');
    rail.setPointerCapture(e.pointerId);
  });
  let dragged = false;
  rail.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.abs(dx);
    if (drag.moved > 6) { dragged = true; rail.scrollLeft = drag.left - dx; }
  });
  const endDrag = () => { if (!drag) return; rail.classList.remove('is-dragging'); drag = null; };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('click', e => {
    const frame = e.target.closest('.frame') || hitFrame;   // capture retargets the click
    hitFrame = null;
    if (dragged) { dragged = false; e.preventDefault(); return; }
    if (frame) openLightbox(frames.indexOf(frame));
  });
  // vertical wheel while hovering the rail should still scroll the page
  rail.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); rail.scrollLeft += e.deltaX; }
  }, { passive: false });

  /* ---- lightbox ---- */
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  let idx = 0, lastFocus = null;

  function paintLb() {
    const f = frames[idx];
    lbImg.src = f.dataset.full;
    lbImg.alt = $('img', f).alt;
    lbCap.textContent = `${$('figcaption b', f).textContent} — ${$('figcaption span', f).textContent}`;
    $('#lbIndex').textContent = idx + 1;
    $('#lbTotal').textContent = frames.length;
  }
  function openLightbox(i) {
    idx = i; lastFocus = document.activeElement;
    lb.hidden = false;
    paintLb();
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.body.classList.add('is-locked');
    $('#lbClose').focus({ preventScroll: true });
  }
  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { lb.hidden = true; }, 320);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  const shift = n => { idx = (idx + n + frames.length) % frames.length; paintLb(); };

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => shift(-1));
  $('#lbNext').addEventListener('click', () => shift(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!lb.hidden) closeLightbox(); else if (!modal.hidden) closePass(); else if ($('#mobilePanel').classList.contains('is-open')) closeSheet(); return; }
    if (lb.hidden) return;
    if (e.key === 'ArrowRight') shift(1);
    if (e.key === 'ArrowLeft') shift(-1);
  });
  // touch swipe inside the viewer
  let tx = 0;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 46) shift(dx < 0 ? 1 : -1);
  });
}

/* =====================================================================
   10 · NAVIGATION
   ===================================================================== */
function closeSheet() {
  const panel = $('#mobilePanel');
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  $('#burger').classList.remove('is-open');
  $('#burger').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('is-locked');
}

function initNav() {
  const burger = $('#burger');
  const panel = $('#mobilePanel');
  burger.addEventListener('click', () => {
    const open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
  });

  // every in-page anchor gets an inertial glide instead of a hard jump
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeSheet();
    FX.scrollTo(target, id === '#home' ? 0 : null);
    history.replaceState(null, '', id);
  });
}

/* =====================================================================
   11 · TICKER, FACTS, STATS
   ===================================================================== */
function renderTicker() {
  const list = sortedEvents();
  const html = list.map(ev => {
    const d = formatDateParts(ev.date);
    return `<span><b>${ev.name}</b></span><span>${d.weekday} ${d.short}</span><i>◆</i><span>${ev.venue}</span><i>◆</i>`;
  }).join('');
  $('#tickerTrack').innerHTML = html;
  $('#tickerTrack2').innerHTML = html;
}

function renderFacts() {
  const seats = totalSeats();
  $('#factEvents').textContent = EVENTS.length;
  $('#factSeats').textContent = seats.toLocaleString('en-IN');

  const nums = $$('.stat__num');
  if (nums[0]) { nums[0].dataset.count = EVENTS.length; nums[0].dataset.suffix = ''; }
  if (nums[1]) { nums[1].dataset.count = seats; nums[1].dataset.suffix = ''; }
  if (nums[3]) { nums[3].dataset.count = Math.max(...EVENTS.map(e => e.hours)); nums[3].dataset.suffix = 'h'; }
  if (nums[0]) $('#countAll').textContent = EVENTS.length;

}

/* =====================================================================
   BOOT
   ===================================================================== */
/**
 * The hero headline promises a number of events. Stating it from EVENTS keeps the
 * claim honest if a term's lineup changes; the HTML carries the same words so the
 * page reads correctly before this script runs.
 */
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function syncHeroCount() {
  const el = $('#heroCountLine');
  if (!el) return;
  const n = EVENTS.length;
  el.textContent = `${NUMBER_WORDS[n] || n} event${n === 1 ? '' : 's'}.`;
}

function boot() {
  renderEventGrid();
  syncHeroCount();
  renderTicker();
  renderFacts();
  initTheme();
  initWizard();
  initFeedback();
  initPassModal();
  initRail();
  initNav();
  pickNextEvent();
  tickClock();
  setInterval(() => { updateCountdown(); tickClock(); }, 1000);
  updateCountdown();
  moveIndicator();
  FX.init();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
