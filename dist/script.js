import { erasedFraction, shouldReveal, countdownTo } from './invitation-core.mjs';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = document.getElementById('envelope-stage');
const openButton = document.getElementById('open-envelope');
const pages = document.getElementById('invitation-pages');
let opened = false;
openButton.addEventListener('click', () => {
  if (opened) return;
  opened = true;
  startWeddingMusic();
  openButton.disabled = true;
  stage.setAttribute('aria-busy', 'true');
  stage.classList.add('envelope-opening');
  document.getElementById('envelope-instruction').textContent = 'A beautiful new beginning awaits…';
  window.setTimeout(() => {
    pages.hidden = false;
    document.getElementById('music-toggle').hidden = false;
    document.body.classList.remove('sealed');
    window.scrollTo({ top: 0, behavior: 'instant' });
    stage.classList.add('leaving');
    window.setTimeout(() => {
      stage.hidden = true;
      stage.removeAttribute('aria-busy');
      const sectionId = window.location?.hash?.slice(1);
      const linkedSections = ['couple', 'save-the-date', 'haldi', 'sangeet', 'phera', 'reception', 'vadhu-aagman', 'venue'];
      const target = linkedSections.includes(sectionId) ? document.getElementById(sectionId) : null;
      if (target) {
        target.tabIndex = -1;
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
        target.focus({ preventScroll: true });
      } else {
        document.getElementById('welcome-title').focus({ preventScroll: true });
      }
    }, reducedMotion ? 0 : 500);
  }, reducedMotion ? 80 : 1600);
});

// Wait for the names themselves, so the animation is not spent on the kalash page.
const coupleNames = document.getElementById('couple-title');
if (!reducedMotion && 'IntersectionObserver' in window) {
  coupleNames.classList.add('names-pending');
  const namesObserver = new window.IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.4)) return;
    coupleNames.classList.remove('names-pending');
    coupleNames.classList.add('names-writing');
    namesObserver.disconnect();
  }, { threshold: 0.4 });
  namesObserver.observe(coupleNames);
}

// Fixed canvas coordinates keep erased area and the threshold stable on resize.
const canvas = document.getElementById('scratch-canvas');
const card = document.getElementById('scratch-card');
const dateContent = document.getElementById('date-content');
const scratchHint = document.getElementById('scratch-hint');
const scratchProgress = document.getElementById('scratch-progress');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let revealed = false;
let scratching = false;
let previousPoint = null;
let scratchPointer = null;
let touched = false;
let lastMeasurement = 0;
let lastAnnouncement = -1;
let countdownInterval;

function drawScratchCoating() {
  if (!ctx || touched || revealed) return;
  const { width, height } = canvas;
  ctx.globalCompositeOperation = 'source-over';
  const ink = ctx.createLinearGradient(0, 0, width, height);
  ink.addColorStop(0, '#651523');
  ink.addColorStop(0.35, '#842338');
  ink.addColorStop(0.65, '#752033');
  ink.addColorStop(1, '#581421');
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, width, height);
  // Fine, deterministic pigment grain gives the maroon ink a softly printed finish.
  for (let index = 0; index < 2600; index++) {
    const x = (index * 73.31) % width;
    const y = (index * 47.77) % height;
    ctx.fillStyle = index % 2 ? 'rgba(255,232,208,.055)' : 'rgba(32,3,13,.08)';
    ctx.fillRect(x, y, 0.6 + index % 3 * 0.35, 0.7 + index % 4 * 0.3);
  }
  ctx.strokeStyle = 'rgba(223,189,134,.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.strokeStyle = 'rgba(255,235,202,.25)';
  ctx.strokeRect(27, 27, width - 54, height - 54);
  ctx.fillStyle = '#e2c58f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '38px Georgia, serif';
  ctx.fillText('✧', width / 2, height * 0.22);
  ctx.fillStyle = '#fff0d5';
  ctx.font = 'italic 52px Georgia, serif';
  ctx.fillText('A little secret…', width / 2, height * 0.43);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('SCRATCH TO REVEAL', width / 2, height * 0.63);
  ctx.font = 'italic 23px Georgia, serif';
  ctx.fillText('our wedding dates', width / 2, height * 0.76);
  card.classList.add('ready');
}

function updateCountdown() {
  const value = countdownTo();
  for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
    document.querySelector(`[data-unit="${unit}"]`).textContent = String(value[unit]).padStart(2, '0');
  }
  if (value.started) {
    document.getElementById('countdown-title').textContent = 'Our wedding celebrations have begun!';
    clearInterval(countdownInterval);
  }
}
function celebrate() {
  if (reducedMotion) return;
  const layer = document.getElementById('confetti-layer');
  const colours = ['#9b2437', '#cda14e', '#73875c', '#efd79a', '#b2696e', '#f9edc8'];
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 120; index++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--confetti-color', colours[index % colours.length]);
    piece.style.setProperty('--confetti-x', `${(Math.random() - 0.5) * window.innerWidth * 1.5}px`);
    piece.style.setProperty('--confetti-y', `${window.innerHeight * (0.55 + Math.random() * 0.45)}px`);
    piece.style.setProperty('--confetti-spin', `${(Math.random() - 0.5) * 1400}deg`);
    piece.style.setProperty('--flight', `${2.4 + Math.random() * 1.2}s`);
    piece.style.setProperty('--confetti-delay', `${Math.random() * 0.28}s`);
    piece.style.borderRadius = index % 3 === 0 ? '50%' : '1px';
    fragment.appendChild(piece);
  }
  layer.appendChild(fragment);
  window.setTimeout(() => layer.replaceChildren(), 4400);
}
function revealDate() {
  if (revealed) return;
  revealed = true;
  scratching = false;
  const keyboardFocus = document.activeElement === canvas;
  card.classList.add('revealed');
  dateContent.removeAttribute('aria-hidden');
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-hidden', 'true');
  scratchHint.textContent = '27 & 28 November 2026 · Etawah, U.P.';
  scratchProgress.textContent = 'Our dates are revealed. Let the countdown to forever begin!';
  document.getElementById('countdown-wrap').hidden = false;
  updateCountdown();
  if (!countdownTo().started) countdownInterval = window.setInterval(updateCountdown, 1000);
  celebrate();
  if (keyboardFocus) { dateContent.tabIndex = -1; dateContent.focus({ preventScroll: true }); }
}
function measureProgress(force = false) {
  if (!ctx || revealed) return;
  const now = performance.now();
  if (!force && now - lastMeasurement < 100) return;
  lastMeasurement = now;
  const fraction = erasedFraction(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  if (shouldReveal(fraction)) { revealDate(); return; }
  const percent = Math.floor(fraction * 100);
  const announcement = Math.floor(percent / 10);
  if (announcement !== lastAnnouncement) {
    scratchProgress.textContent = `${percent}% uncovered · Keep scratching to reveal the surprise`;
    lastAnnouncement = announcement;
  }
}
function pointFrom(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * canvas.width, y: (event.clientY - rect.top) / rect.height * canvas.height };
}
function eraseTo(point) {
  if (!ctx || revealed) return;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 85;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(previousPoint?.x ?? point.x, previousPoint?.y ?? point.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(point.x, point.y, 42.5, 0, Math.PI * 2); ctx.fill();
  // A softly feathered, slightly uneven ink wash follows the opaque reveal core.
  const from = previousPoint ?? point;
  const distance = Math.hypot(point.x - from.x, point.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 16));
  for (let step = 0; step <= steps; step++) {
    const x = from.x + (point.x - from.x) * step / steps;
    const y = from.y + (point.y - from.y) * step / steps;
    const radius = 49 + 1.5 * Math.sin(x * 0.17 + y * 0.13);
    const edge = ctx.createRadialGradient(x, y, 42.5, x, y, radius);
    edge.addColorStop(0, 'rgba(0,0,0,.65)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  previousPoint = point;
}
canvas.addEventListener('pointerdown', event => {
  if (revealed || (event.pointerType === 'mouse' && event.button !== 0) || scratchPointer !== null) return;
  event.preventDefault();
  touched = true;
  scratching = true;
  scratchPointer = event.pointerId;
  previousPoint = null;
  canvas.setPointerCapture(event.pointerId);
  eraseTo(pointFrom(event));
  measureProgress();
});
canvas.addEventListener('pointermove', event => {
  if (!scratching || revealed || event.pointerId !== scratchPointer) return;
  event.preventDefault();
  eraseTo(pointFrom(event));
  measureProgress();
});
function finishScratch(event) {
  if (event.pointerId !== scratchPointer) return;
  scratching = false;
  scratchPointer = null;
  previousPoint = null;
  measureProgress(true);
}
canvas.addEventListener('pointerup', finishScratch);
canvas.addEventListener('pointercancel', finishScratch);
canvas.addEventListener('lostpointercapture', finishScratch);
canvas.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); revealDate(); }
});
if (ctx) {
  drawScratchCoating();
} else {
  // A fully usable fallback for browsers without a 2D canvas.
  canvas.hidden = true;
  const fallback = document.createElement('button');
  fallback.className = 'reveal-fallback';
  fallback.textContent = 'Reveal our wedding dates';
  fallback.addEventListener('click', () => { fallback.remove(); revealDate(); });
  card.appendChild(fallback);
}

const copyButton = document.getElementById('copy-hashtag');
const copyStatus = document.getElementById('copy-status');
let copyReset;
copyButton.addEventListener('click', async () => {
  clearTimeout(copyReset);
  try {
    await navigator.clipboard.writeText('#SriyanshKiShrishti');
    copyStatus.textContent = 'Copied with love. #SriyanshKiShrishti';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(copyButton);
    selection.removeAllRanges(); selection.addRange(range);
    copyStatus.textContent = 'Hashtag selected — use your copy shortcut or press and hold.';
  }
  copyReset = window.setTimeout(() => { copyStatus.textContent = ''; }, 6500);
});

if (!reducedMotion) {
  const petals = document.getElementById('petals');
  for (let index = 0; index < 14; index++) {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.style.setProperty('--left', `${(index * 13 + 7) % 100}%`);
    petal.style.setProperty('--duration', `${30 + index % 7 * 3}s`);
    petal.style.setProperty('--delay', `${-index * 3.7}s`);
    petals.appendChild(petal);
  }
}
// Play the uploaded clip directly from the envelope gesture; no external player.
const musicButton = document.getElementById('music-toggle');
const musicLabel = document.getElementById('music-label');
const musicStatus = document.getElementById('music-status');
const weddingAudio = document.getElementById('wedding-audio');
weddingAudio.volume = 0.35;
let musicRequested = false;
let musicPlaying = false;
let musicRequest = 0;
function updateMusicState() {
  musicButton.setAttribute('aria-pressed', String(musicPlaying));
  musicButton.setAttribute('aria-label', musicRequested || musicPlaying ? 'Pause wedding music' : 'Play wedding music');
  musicLabel.textContent = musicPlaying ? 'Music on' : 'Play music';
}
function pauseMusic() {
  musicRequest++;
  musicRequested = false;
  musicPlaying = false;
  weddingAudio.pause();
  musicStatus.textContent = 'Music paused';
  updateMusicState();
}
function musicFailed(error, request = musicRequest) {
  if (request !== musicRequest) return;
  musicRequested = false;
  musicPlaying = false;
  musicStatus.textContent = error?.name === 'NotAllowedError'
    ? 'Tap the music button to start the music'
    : 'Music unavailable. Tap the music button to retry.';
  updateMusicState();
}
function startWeddingMusic() {
  const request = ++musicRequest;
  musicRequested = true;
  musicButton.hidden = false;
  musicStatus.textContent = 'Starting music';
  updateMusicState();
  try {
    // Keep play() inside the tap handler so mobile browsers receive the gesture.
    const playback = weddingAudio.play();
    playback?.catch(error => musicFailed(error, request));
  } catch (error) { musicFailed(error, request); }
}
weddingAudio.addEventListener('playing', () => {
  if (!musicRequested || document.hidden) { pauseMusic(); return; }
  musicPlaying = true;
  musicStatus.textContent = 'Wedding music is playing';
  updateMusicState();
});
weddingAudio.addEventListener('pause', () => {
  if (!weddingAudio.paused) return;
  musicPlaying = false;
  musicRequested = false;
  musicStatus.textContent = 'Music paused';
  updateMusicState();
});
weddingAudio.addEventListener('error', () => musicFailed(weddingAudio.error));
musicButton.addEventListener('click', () => {
  if (musicRequested || musicPlaying) pauseMusic();
  else startWeddingMusic();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (musicRequested || musicPlaying)) pauseMusic();
});
updateMusicState();

// RSVP form
(function () {
  const form = document.getElementById('rsvp-form');
  if (!form) return;
  const guestsField = document.getElementById('rsvp-guests-field');
  const successEl  = document.getElementById('rsvp-success');
  const submitBtn  = form.querySelector('.rsvp-submit');

  form.querySelectorAll('.rsvp-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      const declining = radio.value === 'Regretfully declines' && radio.checked;
      guestsField.classList.toggle('rsvp-hidden', declining);
      if (declining) document.getElementById('rsvp-guests').removeAttribute('required');
      else document.getElementById('rsvp-guests').setAttribute('required', '');
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.hidden = true;
        successEl.hidden = false;
      } else {
        submitBtn.textContent = 'Something went wrong — try again';
        submitBtn.disabled = false;
      }
    } catch {
      submitBtn.textContent = 'Something went wrong — try again';
      submitBtn.disabled = false;
    }
  });
}());
