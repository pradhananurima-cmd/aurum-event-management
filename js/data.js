/* =====================================================================
   AURUM · js/data.js
   ---------------------------------------------------------------------
   Single source of truth for the whole page.  Events, categories and
   semester info all live here; the DOM is rendered from this file by
   js/main.js (FEATURE 1 — dynamic event rendering).

   All timestamps are stored with an explicit IST offset (+05:30) and are
   always formatted with timeZone: "Asia/Kolkata", so the printed date can
   never drift for a visitor in another timezone.
   ===================================================================== */

'use strict';

const COLLEGE = {
  name: 'Institute of Engineering & Management, Kolkata',
  short: 'IEM Kolkata',
  department: 'Department of CSE (AIML)',
  campus: 'Gurukul Campus, Sector V, Salt Lake, Kolkata 700091',
  semester: 'Odd semester 2026–27',
  course: 'PCCCS382 — IT Workshop',
  email: 'events.aiml@iem.edu.in',
  phone: '+91 33 2357 2059',
  hours: 'Monday – Friday, 10:00 – 17:00 IST'
};

const CATEGORIES = {
  technical: { label: 'Technical', accent: 'gold' },
  workshop:  { label: 'Workshop',  accent: 'mint' },
  cultural:  { label: 'Cultural',  accent: 'rose' },
  lecture:   { label: 'Lecture',   accent: 'azure' }
};

/*
 * Each event carries `art` — its own rendered scene, cropped to the card
 * ratio by tools/make_assets.sh. The filename is deliberately tied to the
 * event so a missing image is obvious at a glance.
 */

/* Registration closes 48 hours before each event. */
const CLOSE_BEFORE_HOURS = 48;

const EVENTS = [
  {
    id: 'hackmatrix',
    name: 'HackMatrix 2026',
    date: '2026-11-14T09:00:00+05:30',
    hours: 12,
    venue: 'AIML Central Lab — Gurukul Campus',
    category: 'technical',
    mode: 'Offline · Team of 3–4',
    fee: 150,
    capacity: 240,
    registered: 168,
    art: 'assets/t-hackmatrix.jpg',
    description: 'A 12-hour build sprint. Teams get one problem statement at the whistle, ship a working prototype by morning and defend it in a three-minute demo.',
    perks: ['Pizzaverse + caffeine pass', 'Mentors from industry', 'Certificate + swag kit']
  },
  {
    id: 'ai-workshop',
    name: 'AI & Machine Learning Workshop',
    date: '2026-11-20T10:00:00+05:30',
    hours: 4,
    venue: 'AI & ML Laboratory',
    category: 'workshop',
    mode: 'Offline · Hands-on',
    fee: 0,
    capacity: 120,
    registered: 94,
    art: 'assets/t-workshop.jpg',
    description: 'A beginner-friendly session that walks a dataset from raw CSV to a trained, evaluated model — in one laptop, one morning.',
    perks: ['Notebook + dataset pack', 'No prior ML needed', 'Lab machines provided']
  },
  {
    id: 'codesprint',
    name: 'CodeSprint 2026',
    date: '2026-11-22T10:00:00+05:30',
    hours: 6,
    venue: 'Computer Lab 1',
    category: 'technical',
    mode: 'Offline · Individual',
    fee: 0,
    capacity: 160,
    registered: 141,
    art: 'assets/t-codesprint.jpg',
    description: 'Timed problem-solving across logic, algorithms and dynamic programming, with a live scoreboard and penalty-based ranking.',
    perks: ['Live leaderboard', '10 problems, 6 hours', 'Top 3 felicitated']
  },
  {
    id: 'robotech',
    name: 'RoboTech Challenge',
    date: '2026-11-25T11:00:00+05:30',
    hours: 5,
    venue: 'Robotics & IoT Lab',
    category: 'workshop',
    mode: 'Offline · Team of 2',
    fee: 0,
    capacity: 100,
    registered: 52,
    art: 'assets/t-robotech.jpg',
    description: 'Line-following, obstacle avoidance and a creative prototype round — built on microcontrollers the lab provides.',
    perks: ['Kit & sensors supplied', 'Two heats + finale', 'Judged by ECE faculty']
  },
  {
    id: 'innovacion',
    name: 'Innovacion — Cultural Night',
    date: '2026-11-27T18:00:00+05:30',
    hours: 5,
    venue: 'Central Auditorium',
    category: 'cultural',
    mode: 'Open to all branches',
    fee: 0,
    capacity: 400,
    registered: 286,
    art: 'assets/t-cultural.jpg',
    description: 'The annual tech-and-culture meet: band night, a dance face-off, the project exhibition floor and the prize ceremony for the semester.',
    perks: ['Fest pass included', 'Project expo floor', 'Guest performance']
  },
  {
    id: 'innovatex',
    name: 'InnovateX Project Expo',
    date: '2026-11-28T10:00:00+05:30',
    hours: 8,
    venue: 'Seminar Hall',
    category: 'technical',
    mode: 'Poster + live demo',
    fee: 0,
    capacity: 180,
    registered: 76,
    art: 'assets/t-expo.jpg',
    description: 'Semester projects pitched to a panel of faculty and alumni — software, AI and IoT solutions to everyday problems, judged at the bench.',
    perks: ['Alumni jury panel', 'Best 10 go to the fest', 'Feedback report']
  },
  {
    id: 'cyberquest',
    name: 'CyberQuest 2026',
    date: '2026-12-02T11:00:00+05:30',
    hours: 2,
    venue: 'Computer Lab 2',
    category: 'lecture',
    mode: 'Guest lecture + CTF',
    fee: 0,
    capacity: 120,
    registered: 38,
    art: 'assets/t-cyberquest.jpg',
    description: 'An industry session on privacy, passwords and network hygiene, followed by a capture-the-flag round on deliberately vulnerable machines.',
    perks: ['Speaker: security analyst', 'Mini CTF round', 'Attendance counted']
  }
];

const GALLERY = [
  { src: 'assets/g-01.jpg', title: "HackMatrix ’25", sub: 'Final build hour, AIML Central Lab' },
  { src: 'assets/g-02.jpg', title: 'Innovacion', sub: 'Opening night, annual tech fest' },
  { src: 'assets/g-03.jpg', title: 'Deep Learning Lab', sub: 'Hands-on session, AIML laboratory' },
  { src: 'assets/g-04.jpg', title: 'Project Expo', sub: 'Bench-side judging, Seminar Hall' },
  { src: 'assets/g-05.jpg', title: 'RoboTech', sub: 'Line-follower run 4, Robotics Lab' },
  { src: 'assets/g-06.jpg', title: 'Guest Lecture', sub: 'Industry session, Seminar Hall' }
];

const COORDINATORS = [
  { initials: 'SB', name: 'Dr. Sudipta Bhattacharya', role: 'Faculty coordinator', note: 'Associate Professor, CSE (AIML)' },
  { initials: 'AP', name: 'Anurima Pradhan', role: 'Student coordinator', note: '2nd year, CSE (AIML) · Roll 28, Sec E' },
  { initials: 'KD', name: 'Kaustav Dutta', role: 'Technical lead', note: '4th year, CSE (AIML)' },
  { initials: 'MG', name: 'Mahi Ghosh', role: 'Cultural lead', note: '2nd year, CSE (AIML)' }
];

/* ---------------------------------------------------------------------
   Shared helpers (used by both files)
   --------------------------------------------------------------------- */
const IST = 'Asia/Kolkata';

/** Sort order is always chronological, never declaration order. */
function sortedEvents() {
  return [...EVENTS].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function eventById(id) {
  return EVENTS.find(ev => ev.id === id) || null;
}

/** Every date/time string on the page is produced here. */
function formatDateParts(iso) {
  const d = new Date(iso);
  const opt = (extra) => ({ timeZone: IST, ...extra });
  return {
    day: d.toLocaleDateString('en-IN', opt({ day: '2-digit' })),
    month: d.toLocaleDateString('en-IN', opt({ month: 'short', year: 'numeric' })),
    weekday: d.toLocaleDateString('en-IN', opt({ weekday: 'short' })),
    full: d.toLocaleDateString('en-IN', opt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    short: d.toLocaleDateString('en-IN', opt({ day: '2-digit', month: 'short' })),
    time: d.toLocaleTimeString('en-IN', opt({ hour: '2-digit', minute: '2-digit', hour12: true }))
  };
}

function formatFee(fee) {
  return fee > 0 ? '₹' + fee : 'Free';
}

/** Registration deadline = 48 h before start. */
function closesAt(iso) {
  return new Date(new Date(iso).getTime() - CLOSE_BEFORE_HOURS * 3600000);
}

function totalSeats() {
  return EVENTS.reduce((sum, ev) => sum + ev.capacity, 0);
}
