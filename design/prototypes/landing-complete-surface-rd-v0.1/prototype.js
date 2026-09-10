const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const narrow = window.matchMedia('(max-width: 900px)');

const heroMatrix = document.querySelector('[data-hero-matrix]');
if (heroMatrix) {
  heroMatrix.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const rect = heroMatrix.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    heroMatrix.style.setProperty('--px', px.toFixed(3));
    heroMatrix.style.setProperty('--py', py.toFixed(3));
  });
  heroMatrix.addEventListener('pointerleave', () => {
    heroMatrix.style.setProperty('--px', '0');
    heroMatrix.style.setProperty('--py', '0');
  });
}

const threadSection = document.querySelector('#thread');
const threadStage = document.querySelector('[data-thread-stage]');
const threadLabels = [...document.querySelectorAll('[data-thread-label]')];
const threadCaption = document.querySelector('[data-thread-caption]');
const captions = ['CREATE IMAGE', 'SHAPE WITH REFERENCES', 'SET IN MOTION', 'SAVED TO LIBRARY'];
let threadStep = -1;

function setThreadStep(step) {
  const next = clamp(step, 0, 3);
  if (next === threadStep || !threadStage) return;
  threadStep = next;
  threadStage.dataset.active = String(next);
  threadLabels.forEach((label, index) => label.classList.toggle('is-active', index === next));
  if (threadCaption) threadCaption.textContent = captions[next];
}

function updateThread() {
  if (!threadSection || !threadStage) return;
  if (reducedMotion.matches) {
    setThreadStep(3);
    return;
  }
  const rect = threadSection.getBoundingClientRect();
  const travel = Math.max(1, threadSection.offsetHeight - window.innerHeight);
  const progress = clamp((-rect.top + (narrow.matches ? 64 : 72)) / travel);
  setThreadStep(Math.min(3, Math.floor(progress * 4.02)));
}

const threadMedia = document.querySelector('.thread-media-shell');
if (threadMedia) {
  threadMedia.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || narrow.matches || event.pointerType === 'touch') return;
    const rect = threadMedia.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    threadMedia.style.setProperty('--stage-x', `${(x * 5).toFixed(2)}px`);
    threadMedia.style.setProperty('--stage-y', `${(y * 4).toFixed(2)}px`);
    threadMedia.style.setProperty('--stage-rx', `${(-y * 1.3).toFixed(2)}deg`);
    threadMedia.style.setProperty('--stage-ry', `${(x * 1.7).toFixed(2)}deg`);
  });
  threadMedia.addEventListener('pointerleave', () => {
    ['--stage-x','--stage-y','--stage-rx','--stage-ry'].forEach((name) => threadMedia.style.removeProperty(name));
  });
}

const libraryField = document.querySelector('[data-library-field]');
const libraryCards = [...document.querySelectorAll('[data-library-card]')];
const libraryTitle = document.querySelector('[data-library-title]');
const libraryMeta = document.querySelector('[data-library-meta]');
const libraryActions = document.querySelector('[data-library-actions]');
let libraryActive = 0;

function applyLibraryYield() {
  if (!libraryCards.length) return;
  if (narrow.matches || reducedMotion.matches) {
    libraryCards.forEach((card) => {
      card.style.setProperty('--yield-x', '0px');
      card.style.setProperty('--yield-y', '0px');
    });
    return;
  }
  const active = libraryCards[libraryActive];
  const a = active.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  libraryCards.forEach((card, index) => {
    if (index === libraryActive) {
      card.style.setProperty('--yield-x', '0px');
      card.style.setProperty('--yield-y', '0px');
      return;
    }
    const r = card.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - ax;
    const dy = (r.top + r.height / 2) - ay;
    const length = Math.max(1, Math.hypot(dx, dy));
    card.style.setProperty('--yield-x', `${(dx / length * 20).toFixed(1)}px`);
    card.style.setProperty('--yield-y', `${(dy / length * 15).toFixed(1)}px`);
  });
}

function selectLibrary(index, { scroll = false } = {}) {
  libraryActive = index;
  libraryCards.forEach((card, cardIndex) => {
    const active = cardIndex === index;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const card = libraryCards[index];
  if (libraryTitle) libraryTitle.textContent = card.dataset.title || '';
  if (libraryMeta) libraryMeta.textContent = card.dataset.meta || '';
  if (libraryActions) {
    libraryActions.replaceChildren(...(card.dataset.actions || '').split('|').filter(Boolean).map((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      return span;
    }));
  }
  if (scroll && narrow.matches) card.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  requestAnimationFrame(applyLibraryYield);
}

libraryCards.forEach((card, index) => {
  card.addEventListener('click', () => selectLibrary(index, { scroll: true }));
  card.addEventListener('focus', () => selectLibrary(index));
  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && window.matchMedia('(pointer:fine)').matches) selectLibrary(index);
  });
});
selectLibrary(0);

const resolveSection = document.querySelector('#resolve');
const resolveTiles = [...document.querySelectorAll('[data-resolve-tile]')];
const peripherals = [...document.querySelectorAll('[data-peripheral]')];
const resolveLabel = document.querySelector('[data-resolve-label]');
let lastResolve = -1;

function setResolve(progress) {
  const p = clamp(progress);
  if (Math.abs(p - lastResolve) < .002) return;
  lastResolve = p;
  resolveTiles.forEach((tile) => {
    const dx = Number(tile.dataset.dx || 0);
    const dy = Number(tile.dataset.dy || 0);
    const baseScale = Number(tile.dataset.scale || 1);
    const rotate = Number(tile.dataset.rotate || 0);
    const inv = 1 - p;
    const scale = baseScale + (1 - baseScale) * p;
    tile.style.transform = `translate(${(dx * inv).toFixed(2)}px, ${(dy * inv).toFixed(2)}px) rotate(${(rotate * inv).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
  });
  peripherals.forEach((item) => {
    item.style.opacity = String((1 - p) * .74);
    item.style.filter = `blur(${(p * 5).toFixed(2)}px)`;
  });
  if (resolveLabel) resolveLabel.textContent = `RESOLVE ${String(Math.round(p * 100)).padStart(3,'0')}`;
}

function updateResolve() {
  if (!resolveSection) return;
  if (narrow.matches || reducedMotion.matches) {
    setResolve(1);
    return;
  }
  const rect = resolveSection.getBoundingClientRect();
  const travel = Math.max(1, resolveSection.offsetHeight - window.innerHeight);
  setResolve(clamp((-rect.top + 72) / travel));
}

let ticking = false;
function onFrame() {
  ticking = false;
  updateThread();
  updateResolve();
}
function requestFrame() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onFrame);
}

window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', () => {
  applyLibraryYield();
  requestFrame();
});
reducedMotion.addEventListener('change', requestFrame);
narrow.addEventListener('change', () => {
  applyLibraryYield();
  requestFrame();
});
requestFrame();
