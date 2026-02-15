const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

let token = null;
let settings = { soundEnabled: true, darkMode: false, showSeconds: false, notificationsEnabled: false };

const slotTimes = [
  ["07:30","08:15"],["08:20","09:05"],["09:10","09:55"],
  ["10:15","11:00"],["11:05","11:50"],["12:00","12:45"],
  ["12:55","13:40"],["13:45","14:30"],["14:35","15:20"],
  ["15:30","16:15"],["16:20","17:05"],["17:10","17:55"]
];

const defaultWeek = [
  ["","D","MA","MA","NT","","","E","G","MI","BS",""],
  ["","E","F","D","D","","","MA","Gg","D","",""],
  ["MA","MA","Gg","NT","NT","","","","","","",""],
  ["D","F","F","WAH","WAH","WAH","WAH","BS","BS","","",""],
  ["","Mu","MA","BG","BG","","","E","RKE","RKE","",""]
];

let week = JSON.parse(JSON.stringify(defaultWeek));

const subjectNames = {
  MA: "Mathematik", D: "Deutsch", E: "Englisch", F: "Französisch",
  NT: "Natur & Technik", Gg: "Geografie", G: "Geschichte",
  BG: "Gestalten", Mu: "Musik", BS: "Sport", MI: "Informatik",
  WAH: "WAH", RKE: "RKE"
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupAuth();
  setupUI();
  checkAuth();
}

function setupAuth() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  document.getElementById('showSignupBtn').addEventListener('click', () => showScreen('signup'));
  document.getElementById('showLoginBtn').addEventListener('click', () => showScreen('login'));
}

function setupUI() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('settingsBtn').addEventListener('click', () => showModal('settings'));
  document.getElementById('closeSettings').addEventListener('click', closeModal);
  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target.id === 'settingsModal') closeModal();
  });

  ['darkMode', 'showSeconds', 'sound', 'notifications'].forEach(key => {
    const toggle = document.getElementById(key + 'Toggle');
    if (toggle) {
      toggle.addEventListener('change', e => {
        const settingKey = key === 'sound' ? 'soundEnabled' : 
                          key === 'notifications' ? 'notificationsEnabled' : key;
        settings[settingKey] = e.target.checked;
        if (key === 'darkMode') applyTheme();
        if (key === 'sound' && e.target.checked) playSound(440, 0.1);
        if (key === 'notifications' && e.target.checked) Notification.requestPermission();
        saveSettings();
      });
    }
  });
}

function checkAuth() {
  token = localStorage.getItem('token');
  if (token) loadUserData();
  else showScreen('login');
}

async function loadUserData() {
  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Invalid token');
    await loadSettings();
    showScreen('app');
    startApp();
  } catch (e) {
    console.error('Auth error:', e);
    logout();
  }
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      settings.soundEnabled = !!data.sound_enabled;
      settings.darkMode = data.theme === 'dark';
      settings.showSeconds = !!data.show_seconds;
      settings.notificationsEnabled = !!data.notifications_enabled;
      if (data.schedule_data) {
        const sd = JSON.parse(data.schedule_data);
        if (sd.week) week = sd.week;
      }
      applyTheme();
      syncSettings();
    }
  } catch (e) {}
}

async function saveSettings() {
  try {
    await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        soundEnabled: settings.soundEnabled,
        theme: settings.darkMode ? 'dark' : 'light',
        showSeconds: settings.showSeconds,
        notificationsEnabled: settings.notificationsEnabled,
        scheduleData: { week }
      })
    });
  } catch (e) {}
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert('loginError', data.error || 'Login fehlgeschlagen');
      return;
    }
    token = data.token;
    localStorage.setItem('token', token);
    await loadSettings();
    showScreen('app');
    startApp();
  } catch (e) {
    showAlert('loginError', 'Verbindungsfehler');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const password = document.getElementById('signupPassword').value;
  const displayName = document.getElementById('signupDisplayName').value;

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert('signupError', data.error || 'Registrierung fehlgeschlagen');
      return;
    }
    showAlert('signupSuccess', 'Konto erstellt! Melde dich jetzt an.', true);
    setTimeout(() => {
      showScreen('login');
      document.getElementById('loginUsername').value = username;
    }, 2000);
  } catch (e) {
    showAlert('signupError', 'Verbindungsfehler');
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  showScreen('login');
}

function showScreen(screen) {
  document.getElementById('loginScreen').classList.toggle('hidden', screen !== 'login');
  document.getElementById('signupScreen').classList.toggle('hidden', screen !== 'signup');
  document.getElementById('app').classList.toggle('hidden', screen !== 'app');
}

function showAlert(id, msg, isSuccess = false) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

function showModal(id) {
  document.getElementById(id + 'Modal').classList.add('active');
  syncSettings();
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function syncSettings() {
  document.getElementById('darkModeToggle').checked = settings.darkMode;
  document.getElementById('showSecondsToggle').checked = settings.showSeconds;
  document.getElementById('soundToggle').checked = settings.soundEnabled;
  document.getElementById('notificationsToggle').checked = settings.notificationsEnabled;
}

function toggleTheme() {
  settings.darkMode = !settings.darkMode;
  applyTheme();
  saveSettings();
}

function applyTheme() {
  document.body.classList.toggle('dark', settings.darkMode);
  document.getElementById('themeBtn').textContent = settings.darkMode ? '☀️' : '🌙';
}

function startApp() {
  update();
  setInterval(update, 1000);
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function toDateToday(hm) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad(m)}:${pad(s)}`;
}

function findCurrentSlot() {
  const now = new Date();
  const dIdx = todayIndex();
  if (dIdx < 0 || dIdx > 4) return { state: 'weekend' };

  for (let i = 0; i < slotTimes.length; i++) {
    const start = toDateToday(slotTimes[i][0]);
    const end = toDateToday(slotTimes[i][1]);
    if (now >= start && now < end) {
      return { state: 'lesson', slot: i, start, end, subject: week[dIdx][i] || 'frei' };
    }
  }

  for (let i = 0; i < slotTimes.length - 1; i++) {
    const end = toDateToday(slotTimes[i][1]);
    const next = toDateToday(slotTimes[i + 1][0]);
    if (now >= end && now < next) {
      return { state: 'break', after: i, end: next, nextSubject: week[dIdx][i + 1] || '' };
    }
  }

  return { state: 'none' };
}

function calculateProgress(type) {
  const now = new Date();
  const dIdx = todayIndex();
  if (dIdx < 0 || dIdx > 4) return type === 'week' ? (dIdx === 5 || dIdx === 6 ? 100 : 0) : 0;

  if (type === 'day') {
    const dayStart = toDateToday(slotTimes[0][0]);
    const dayEnd = toDateToday(slotTimes[slotTimes.length - 1][1]);
    if (now < dayStart) return 0;
    if (now >= dayEnd) return 100;
    return Math.round(((now - dayStart) / (dayEnd - dayStart)) * 100);
  } else {
    const dayProg = calculateProgress('day') / 100;
    return Math.round(((dIdx + dayProg) / 5) * 100);
  }
}

function countLessons() {
  const dIdx = todayIndex();
  if (dIdx < 0 || dIdx > 4) return { total: 0, remaining: 0 };
  const now = new Date();
  let total = 0, remaining = 0;
  for (let i = 0; i < slotTimes.length; i++) {
    if (week[dIdx][i] && week[dIdx][i] !== '') {
      total++;
      if (now < toDateToday(slotTimes[i][1])) remaining++;
    }
  }
  return { total, remaining };
}

function update() {
  const now = new Date();
  
  const timeStr = settings.showSeconds
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('currentTime').textContent = timeStr;

  const dayProg = calculateProgress('day');
  const weekProg = calculateProgress('week');
  document.getElementById('dayPercent').textContent = `${dayProg}%`;
  document.getElementById('dayProgress').style.width = `${dayProg}%`;
  document.getElementById('weekPercent').textContent = `${weekProg}%`;
  document.getElementById('weekProgress').style.width = `${weekProg}%`;

  const lessons = countLessons();
  document.getElementById('totalLessons').textContent = lessons.total;
  document.getElementById('remainingLessons').textContent = lessons.remaining;

  const slot = findCurrentSlot();
  updateCurrent(slot);
  updateSchedule(slot);
}

function updateCurrent(slot) {
  const timer = document.getElementById('timer');
  const pill = document.getElementById('subjectPill');
  const meta = document.getElementById('lessonMeta');

  if (slot.state === 'lesson') {
    const left = Math.floor((slot.end - new Date()) / 1000);
    timer.textContent = formatTime(left);
    timer.classList.toggle('warning', left <= 60);
    const name = subjectNames[slot.subject] || slot.subject;
    pill.textContent = name;
    pill.className = `subject-pill ${slot.subject}`;
    meta.textContent = `${slotTimes[slot.slot][0]} — ${slotTimes[slot.slot][1]}`;
  } else if (slot.state === 'break') {
    const left = Math.floor((slot.end - new Date()) / 1000);
    timer.textContent = formatTime(left);
    timer.classList.remove('warning');
    pill.textContent = 'Pause';
    pill.className = 'subject-pill';
    pill.style.background = '#dcfce7';
    pill.style.color = '#166534';
    meta.textContent = slot.nextSubject ? `Nächste: ${subjectNames[slot.nextSubject]}` : 'Pause';
  } else if (slot.state === 'weekend') {
    timer.textContent = '—';
    pill.textContent = 'Wochenende';
    pill.className = 'subject-pill';
    pill.style.background = '#fee2e2';
    pill.style.color = '#991b1b';
    meta.textContent = 'Geniesse deine freie Zeit';
  } else {
    timer.textContent = '—';
    pill.textContent = 'Keine Lektion';
    pill.className = 'subject-pill';
    pill.style.background = '#e5e7eb';
    pill.style.color = '#374151';
    meta.textContent = 'Schultag vorbei oder noch nicht gestartet';
  }
}

function updateSchedule(current) {
  const list = document.getElementById('scheduleList');
  const dIdx = todayIndex();

  if (dIdx < 0 || dIdx > 4) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">🎉</div><div>Wochenende!</div></div>';
    return;
  }

  list.innerHTML = '';
  for (let i = 0; i < slotTimes.length; i++) {
    const subj = week[dIdx][i];
    if (!subj || subj === '') continue;

    const div = document.createElement('div');
    div.className = 'schedule-item';
    if (current.state === 'lesson' && current.slot === i) div.classList.add('active');

    div.innerHTML = `
      <div class="schedule-time">${slotTimes[i][0]}–${slotTimes[i][1]}</div>
      <span class="schedule-subject ${subj}">${subj}</span>
      <span class="schedule-name">${subjectNames[subj] || subj}</span>
    `;
    list.appendChild(div);
  }
}

function playSound(freq, dur) {
  if (!settings.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}
