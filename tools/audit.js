/* Functional audit of the AURUM site, driven by real Chrome. */
/*
 * Functional audit for the AURUM event platform.
 *
 *   cd tools && npm i && node audit.js
 *
 * Boots a temporary static server one directory up, drives headless Chrome
 * through 72 assertions (data rendering, filtering, countdown/clock, every
 * validation rule, the wizard, the pass modal, localStorage, the lightbox,
 * the theme, motion, layout at three widths) and screenshots each step to
 * tools/shots/. Exits non-zero if anything fails.
 */
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'http://127.0.0.1:5173/';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '5173', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { await sleep(700); })();

const out = [];
const fails = [];
const ok = (name, cond, extra = '') => {
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails.push(name + (extra ? ' — ' + extra : ''));
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => {
    const u = r.url();
    if (!u.includes('fonts.g')) consoleErrors.push('requestfailed: ' + u);
  });

  await page.goto(URL, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1400));

  /* ---------- structure ---------- */
  const cards = await page.$$eval('.card', els => els.map(e => ({
    cat: e.dataset.category, id: e.dataset.id, title: e.querySelector('h3')?.textContent,
    hidden: e.classList.contains('is-hidden')
  })));
  ok('renders all 7 events from data.js', cards.length === 7, `${cards.length} cards`);
  ok('cards carry categories', new Set(cards.map(c => c.cat)).size === 4, [...new Set(cards.map(c => c.cat))].join(','));
  const heroCount = await page.evaluate(() => [document.querySelector('#heroCountLine').textContent.trim(), EVENTS.length]);
  ok('hero headline states the real event count',
     heroCount[0] === ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'][heroCount[1]] + ' events.',
     heroCount.join(' -> '));
  ok('chronological order', cards[0].id === 'hackmatrix' && cards[6].id === 'cyberquest', cards[0].id + ' … ' + cards[6].id);

  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }));
  await new Promise(r => setTimeout(r, 700));
  const arts = await page.evaluate(() => ({
    imgs: Array.from(document.querySelectorAll('.card__art img')).map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight, alt: i.alt })),
    files: EVENTS.map(e => e.art),
  }));
  ok('event artwork loads', arts.imgs.length === 7 && arts.imgs.every(a => a.w > 100), arts.imgs.map(a => a.w).join(','));
  ok('one unique photograph per event', new Set(arts.files).size === 7 && arts.files.every(f => /^assets\/t-[a-z]+\.jpg$/.test(f)), [...new Set(arts.files)].join(' '));
  ok('card art keeps the 3:2 crop', arts.imgs.every(a => Math.abs(a.w / a.h - 1120 / 746) < 0.02), arts.imgs.map(a => (a.w / a.h).toFixed(3)).join(' '));
  ok('every image has a descriptive alt', arts.imgs.every(a => a.alt && a.alt.length > 12), arts.imgs[0].alt);
  const fam = await page.evaluate(() => {
    const g = (sel) => { const e = document.querySelector(sel); return e ? [getComputedStyle(e).fontFamily, getComputedStyle(e).fontWeight].join('|') : 'none'; };
    return { h1: g('.hero h1'), title: g('#events .sec-title'), card: g('.card__body h3'), brand: g('.brand__word') };
  });
  const wt = (v) => +v.split('|')[1];
  ok('display type is a weighted high-contrast serif', Object.values(fam).every(v => /Playfair Display/.test(v) && wt(v) >= 600),
     `h1 ${wt(fam.h1)} · title ${wt(fam.title)} · card ${wt(fam.card)} · brand ${wt(fam.brand)}`);
  ok('the two largest display levels carry real stroke weight', wt(fam.h1) >= 800 && wt(fam.title) >= 700 && wt(fam.card) >= 700,
     `hero ${wt(fam.h1)} / section ${wt(fam.title)} / card ${wt(fam.card)}`);
  ok('local css + js are version-stamped for cache busting',
     (await page.evaluate(() => {
        const refs = Array.from(document.querySelectorAll('link[href^="css/"], script[src^="js/"]'));
        return refs.length > 0 && refs.every(e => /[?&]v=\d+/.test(e.getAttribute('href') || e.getAttribute('src')));
     })));

  /* ---------- feature 1/2: filtering ---------- */
  const counts = await page.$$eval('.chip', els => els.map(e => `${e.dataset.filter}:${e.querySelector('i').textContent}`));
  ok('chip badges computed from data', counts.includes('all:7') && counts.includes('technical:3') && counts.includes('cultural:1'), counts.join(' '));

  await page.click('.chip[data-filter="cultural"]');
  await new Promise(r => setTimeout(r, 700));
  ok('cultural filter shows 1 card', (await page.$$eval('.card:not(.is-hidden)', e => e.length)) === 1);
  await page.click('.chip[data-filter="lecture"]');
  await new Promise(r => setTimeout(r, 700));
  ok('lecture filter shows 1 card', (await page.$$eval('.card:not(.is-hidden)', e => e.length)) === 1);
  await page.click('.chip[data-filter="workshop"]');
  await new Promise(r => setTimeout(r, 700));
  ok('workshop filter shows 2 cards', (await page.$$eval('.card:not(.is-hidden)', e => e.length)) === 2);
  await page.click('.chip[data-filter="all"]');
  await new Promise(r => setTimeout(r, 700));
  ok('reset to all', (await page.$$eval('.card:not(.is-hidden)', e => e.length)) === 7);
  const indW = await page.$eval('#filterInd', e => getComputedStyle(e).width);
  ok('filter pill indicator sized', parseFloat(indW) > 30, indW);

  /* ---------- feature 3/4: countdown + clock ---------- */
  const deck = await page.evaluate(() => ({
    title: document.getElementById('cdTitle').textContent,
    meta: document.getElementById('cdMeta').textContent,
    d: document.getElementById('cdDays').textContent,
    h: document.getElementById('cdHours').textContent,
    m: document.getElementById('cdMins').textContent,
    s: document.getElementById('cdSecs').textContent,
    clock: document.getElementById('clock').textContent
  }));
  ok('countdown targets the next event', deck.title.includes('HackMatrix'), deck.title);
  ok('countdown digits populated', /^\d{2}$/.test(deck.d) && +deck.d > 0, `${deck.d}d ${deck.h}h ${deck.m}m ${deck.s}s`);
  ok('IST clock formatted', /^\d{2}:\d{2}:\d{2}$/.test(deck.clock), deck.clock);
  ok('meta line shows IST time (not 11:30 pm)', /9:00:00 am|9:00 am/i.test(deck.meta), deck.meta);
  const s1 = await page.$eval('#cdSecs', e => e.textContent);
  await new Promise(r => setTimeout(r, 2100));
  const s2 = await page.$eval('#cdSecs', e => e.textContent);
  ok('countdown ticks every second', s1 !== s2, `${s1} -> ${s2}`);

  /* ---------- hero animations ---------- */
  ok('hero line-mask revealed', (await page.$$eval('#heroTitle .line', e => e.filter(x => x.classList.contains('is-up')).length)) === 3);
  const t1 = await page.$eval('#tickerTrack', e => e.getBoundingClientRect().left);
  await new Promise(r => setTimeout(r, 900));
  const t2 = await page.$eval('#tickerTrack', e => e.getBoundingClientRect().left);
  ok('ticker marquee running', Math.abs(t1 - t2) > 3, `Δ${(t1 - t2).toFixed(1)}px`);
  ok('hero facts filled from data', (await page.$eval('#factSeats', e => e.textContent)) === '1,320');
  ok('grain layer present', await page.$eval('.fx-grain', e => getComputedStyle(e).backgroundImage.includes('svg')));

  /* ---------- stats counters ---------- */
  await page.evaluate(() => document.querySelector('.stats').scrollIntoView());
  await new Promise(r => setTimeout(r, 2600));
  const statVals = await page.$$eval('.stat__num', e => e.map(x => x.textContent));
  ok('stat counters counted up', statVals[0] === '7' && statVals[1] === '1,320' && statVals[3] === '12h', statVals.join(' | '));

  /* ---------- feature 5: theme ---------- */
  const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('#themeBtn');
  await new Promise(r => setTimeout(r, 500));
  const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
  const stored = await page.evaluate(() => localStorage.getItem('aurum.theme.v1'));
  ok('theme toggles', themeBefore !== themeAfter, `${themeBefore} -> ${themeAfter}`);
  ok('theme persisted', stored === themeAfter, stored);
  // Captures name their own theme: the toggle above proved persistence, now pin it.
  const setTheme = (mode) => page.evaluate((m) => {
    document.documentElement.dataset.theme = m;
    localStorage.setItem('aurum.theme.v1', m);
  }, mode);
  await page.click('#themeBtn');                       // back to light for this pair
  await new Promise(r => setTimeout(r, 350));
  await setTheme('light');
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: `${SHOTS}/01-hero-light.png`, clip: { x: 0, y: 0, width: 1440, height: 950 } });
  await setTheme('dark');
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: `${SHOTS}/02-hero-dark.png`, clip: { x: 0, y: 0, width: 1440, height: 950 } });
  await page.evaluate(() => document.getElementById('events').scrollIntoView());
  await new Promise(r => setTimeout(r, 1400));
  ok('cards stagger in on scroll', (await page.$$eval('.card', e => e.filter(x => x.classList.contains('is-in')).length)) >= 4,
     (await page.$$eval('.card.is-in', e => e.length)) + ' of 7 revealed');
  await page.screenshot({ path: `${SHOTS}/03-events.png` });

  /* ---------- registration desk ---------- */
  await page.evaluate(() => document.getElementById('register').scrollIntoView());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${SHOTS}/04-register.png` });   // dark: the section's signature look

  ok('step 1 visible only', await page.evaluate(() => !document.querySelector('[data-step="1"]').hidden && document.querySelector('[data-step="2"]').hidden));
  ok('select populated from data', (await page.$$eval('#eventSelect option', e => e.length)) === 8);
  ok('step-2 picker populated', (await page.$$eval('.pick', e => e.length)) === 7);

  await page.click('#nextBtn');                       // empty submit -> errors
  await new Promise(r => setTimeout(r, 250));
  const bads = await page.$$eval('.field.is-bad', e => e.length);
  ok('empty step rejected (5 required fields flagged)', bads === 5, `${bads} flagged`);
  ok('required message on empty field', (await page.$eval('#err-rollNo', e => e.textContent)).includes('required'),
     await page.$eval('#err-rollNo', e => e.textContent));
  ok('status line warns', (await page.$eval('#regStatus', e => e.textContent)).includes('need attention'));

  // bad values
  await page.type('#studentName', 'Anurima Pradhan');
  await page.type('#rollNo', '28E');
  await page.$eval('#department', e => { e.value = 'CSE (AIML)'; e.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.type('#email', 'not-an-email');
  await page.click('#nextBtn');
  await new Promise(r => setTimeout(r, 200));
  ok('roll format enforced', (await page.$eval('#err-rollNo', e => e.textContent)).includes('10 digits'));
  ok('email format enforced', (await page.$eval('#err-email', e => e.textContent)).includes('valid email'));
  ok('gender required', (await page.$eval('#err-gender', e => e.textContent)).length > 0);
  ok('valid name field marked ok', await page.$eval('#studentName', e => e.closest('.field').classList.contains('is-ok')));
  await page.screenshot({ path: `${SHOTS}/05-register-errors.png` });

  // good values
  await page.$eval('#rollNo', e => { e.value = '1234567828'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#email', e => { e.value = 'anurima.pradhan@iem.edu.in'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('#phone', '9830012345');
  await page.click('.segmented label:nth-child(1) span');
  await page.click('#nextBtn');
  await new Promise(r => setTimeout(r, 500));
  ok('step 2 reached', await page.evaluate(() => !document.querySelector('[data-step="2"]').hidden && document.querySelector('[data-step="1"]').hidden));
  ok('step 1 marked done', await page.$eval('#steps li:first-child', e => e.classList.contains('is-done')));
  ok('meter at 66%', (await page.$eval('#stepMeter', e => e.style.width)) === '66.6667%', await page.$eval('#stepMeter', e => e.style.width));

  // event picked through the card CTA path (step 2)
  await page.click('.pick[data-pick="codesprint"]');
  await new Promise(r => setTimeout(r, 300));
  ok('picker syncs select', (await page.$eval('#eventSelect', e => e.value)) === 'codesprint');
  ok('picker marks selection', await page.$eval('.pick[data-pick="codesprint"]', e => e.classList.contains('is-sel')));
  await page.type('#teamName', 'Null Pointers');
  await page.click('#nextBtn');
  await new Promise(r => setTimeout(r, 500));
  const review = await page.$eval('#review', e => e.textContent.replace(/\s+/g, ' '));
  ok('review shows entered data', review.includes('1234567828') && review.includes('CodeSprint 2026') && review.includes('Null Pointers'), review.slice(0, 80));
  await page.click('#submitBtn');
  await new Promise(r => setTimeout(r, 250));
  ok('agreement required before success', await page.evaluate(() => document.getElementById('passModal').hidden));
  await page.$eval('#agree', e => e.click());
  await page.click('#submitBtn');
  await new Promise(r => setTimeout(r, 700));
  ok('pass modal opens', await page.evaluate(() => !document.getElementById('passModal').hidden));
  const passId = await page.$eval('#passId', e => e.textContent);
  ok('pass id generated', /^AUR-\d{4}-[A-Z0-9]{4}$/.test(passId), passId);
  ok('modal echoes event', (await page.$eval('#passEvent', e => e.textContent)) === 'CodeSprint 2026');
  await page.screenshot({ path: `${SHOTS}/05-pass.png` });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('aurum.passes.v1') || '[]'));
  ok('pass saved to localStorage', saved.length === 1 && saved[0].eventId === 'codesprint', JSON.stringify(saved[0]?.name));
  ok('seat count bumped on the card', (await page.$eval('.card[data-id="codesprint"] [data-bar]', e => e.style.width)) === '89%',
     await page.$eval('.card[data-id="codesprint"] [data-bar]', e => e.style.width));
  await page.click('#passClose');
  await new Promise(r => setTimeout(r, 500));
  ok('modal closes', await page.evaluate(() => document.getElementById('passModal').hidden));
  ok('saved-pass panel appears', await page.evaluate(() => !document.getElementById('savedBox').hidden));

  // duplicate guard
  await page.evaluate(() => {
    document.getElementById('studentName').value = 'Anurima Pradhan';
    document.getElementById('rollNo').value = '1234567828';
    document.getElementById('department').value = 'CSE (AIML)';
    document.getElementById('email').value = 'a@b.com';
    document.getElementById('phone').value = '9830012345';
    document.querySelector('input[name="gender"][value="Female"]').checked = true;
    document.getElementById('eventSelect').value = 'codesprint';
  });
  await page.click('#nextBtn'); await new Promise(r => setTimeout(r, 250));
  await page.click('#nextBtn'); await new Promise(r => setTimeout(r, 250));
  await page.click('#agree', { position: { x: 2, y: 2 } }).catch(() => page.$eval('#agree', e => e.click()));
  await new Promise(r => setTimeout(r, 120));
  await page.click('#submitBtn'); await new Promise(r => setTimeout(r, 400));
  const dupMsg = await page.$eval('#regStatus', e => e.textContent);
  ok('duplicate registration blocked', dupMsg.includes('already registered'), dupMsg.slice(0, 60));

  /* ---------- feedback form ---------- */
  await page.evaluate(() => document.getElementById('contact').scrollIntoView());
  await new Promise(r => setTimeout(r, 700));
  await page.type('#fbMessage', 'too short');
  ok('char counter live', (await page.$eval('#fbCount', e => e.textContent)) === '9');
  await page.click('#feedbackForm button[type=submit]');
  await new Promise(r => setTimeout(r, 200));
  ok('feedback validates empty name', (await page.$eval('#err-fbName', e => e.textContent)).includes('required'));
  await page.type('#fbName', 'Anurima Pradhan');
  await page.type('#fbEmail', 'anurima@iem.edu.in');
  await page.$eval('#fbMessage', e => { e.value = 'The countdown and the filter both feel great, thank you!'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#feedbackForm button[type=submit]');
  await new Promise(r => setTimeout(r, 300));
  ok('feedback accepted', (await page.$eval('#fbStatus', e => e.textContent)).includes('Feedback sent'));
  await page.screenshot({ path: `${SHOTS}/06-contact.png` });

  /* ---------- gallery rail + lightbox ---------- */
  await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${SHOTS}/07-gallery.png` });
  const gImgs = await page.$$eval('.frame img', els => els.map(i => i.naturalWidth));
  ok('all 6 gallery artworks load', gImgs.length === 6 && gImgs.every(w => w > 100), gImgs.join(','));
  ok('gallery frames keep the 4:5 crop', (await page.$$eval('.frame img', els => els.every(i => Math.abs(i.naturalWidth / i.naturalHeight - 920 / 1150) < 0.02))));
  ok('magnifier badges injected', (await page.$$eval('.frame__zoom', e => e.length)) === 6);
  const before = await page.$eval('#rail', e => e.scrollLeft);
  await page.click('#railNext');
  await new Promise(r => setTimeout(r, 900));
  ok('rail arrows scroll the strip', (await page.$eval('#rail', e => e.scrollLeft)) > before);
  await page.click('.frame');
  await new Promise(r => setTimeout(r, 600));
  ok('lightbox opens on click', await page.evaluate(() => !document.getElementById('lightbox').hidden));
  ok('lightbox shows full art', (await page.$eval('#lbImg', e => e.naturalWidth)) > 500);
  ok('lightbox counter', (await page.$eval('#lbTotal', e => e.textContent)) === '6');
  await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 250));
  ok('arrow keys navigate', (await page.$eval('#lbIndex', e => e.textContent)) === '2');
  await page.screenshot({ path: `${SHOTS}/08-lightbox.png` });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));
  ok('Escape closes lightbox', await page.evaluate(() => document.getElementById('lightbox').hidden));

  /* ---------- about ---------- */
  await page.evaluate(() => document.getElementById('about').scrollIntoView());
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}/09-about.png` });
  const revealCount = await page.$$eval('[data-reveal].in', e => e.length);
  ok('scroll reveals firing', revealCount >= 6, `${revealCount} revealed`);
  const auroraMoved = await page.$eval('#aurora', e => e.style.cssText);
  ok('aurora transform bound', auroraMoved.includes('--mx'), auroraMoved || '(no inline vars yet)');

  /* ---------- nav / anchors / burger ---------- */
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await page.click('.nav__link[href="#gallery"]');
  await new Promise(r => setTimeout(r, 1400));
  const scrolled = await page.evaluate(() => Math.round(window.scrollY));
  ok('anchor glide scrolls page', scrolled > 2000, 'y=' + scrolled);
  ok('section spy marks nav', await page.$eval('.nav__link[href="#gallery"]', e => e.classList.contains('is-current')));
  ok('scroll progress advanced', parseFloat(await page.$eval('#scrollBar', e => e.style.getPropertyValue('--p') || '0')) > 0.2);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#burger');
  await new Promise(r => setTimeout(r, 800));
  ok('mobile sheet opens', await page.$eval('#mobilePanel', e => e.classList.contains('is-open')));
  await page.screenshot({ path: `${SHOTS}/10-mobile-menu.png` });
  await page.click('.sheet__nav a[href="#events"]');
  await new Promise(r => setTimeout(r, 1200));
  ok('sheet closes on nav', await page.$eval('#mobilePanel', e => !e.classList.contains('is-open')));
  await page.screenshot({ path: `${SHOTS}/11-mobile-events.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow on mobile', overflow <= 1, `${overflow}px`);

  await page.setViewport({ width: 834, height: 1112, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${SHOTS}/12-tablet.png` });
  const overflowT = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow on tablet', overflowT <= 1, `${overflowT}px`);

  /* ---------- regression guards found in review ---------- */
  const conf = await page.evaluate(async () => {
    const cv = document.getElementById('confetti');
    const ctx = cv.getContext('2d');
    const ink = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let a = 0; for (let i = 3; i < d.length; i += 400) a += d[i]; return a; };
    FX.burst(600, 300, 120);
    await new Promise(r => setTimeout(r, 260));
    const during = ink();
    await new Promise(r => setTimeout(r, 5200));
    return { during, after: ink() };
  });
  ok('confetti paints then self-clears', conf.during > 0 && conf.after === 0, JSON.stringify(conf));

  const indGeo = await page.evaluate(() => {
    const i = document.getElementById('filterInd').getBoundingClientRect();
    const c = document.querySelector('.chip.is-active').getBoundingClientRect();
    return { dw: Math.abs(i.width - c.width), dh: Math.abs(i.height - c.height) };
  });
  ok('filter pill matches chip box', indGeo.dw < 3 && indGeo.dh < 3, JSON.stringify(indGeo));

  const capBox = await page.evaluate(() => {
    const f = document.querySelector('.frame');
    const cap = f.querySelector('figcaption').getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    return cap.bottom <= fr.bottom + 1 && cap.top >= fr.top;
  });
  ok('gallery caption fully inside frame', capBox);

  /* ---------- report ---------- */
  const noise = consoleErrors.filter(e => !/fonts\.g|favicon/.test(e));
  ok('no console errors / failed requests', noise.length === 0, noise.slice(0, 6).join(' || '));

  console.log(out.join('\n'));
  console.log('\n' + (fails.length ? `${fails.length} FAILURE(S):\n- ` + fails.join('\n- ') : 'ALL ' + out.length + ' CHECKS PASSED'));
  await browser.close();
  server.kill();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('\nHARNESS ERROR:', e.message); console.log('\nfailures so far: ' + fails.length); server.kill(); process.exit(2); });
