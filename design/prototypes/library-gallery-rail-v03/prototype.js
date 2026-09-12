const params = new URLSearchParams(window.location.search);
const states = new Set(['default', 'uploads', 'search', 'selection']);
const requestedState = states.has(params.get('state')) ? params.get('state') : 'default';
const body = document.body;

const creativesTab = document.querySelector('#creatives-tab');
const uploadsTab = document.querySelector('#uploads-tab');
const uploadAction = document.querySelector('#upload-action');
const searchInput = document.querySelector('#library-search');
const clearSearch = document.querySelector('#clear-search');
const commandDefault = document.querySelector('#command-default');
const selectionMode = document.querySelector('#selection-mode');
const contextLabel = document.querySelector('#context-label');
const contextHelp = document.querySelector('#context-help');
const mediaCount = document.querySelector('#media-count');
const selectTrigger = document.querySelector('#select-trigger');
const cancelSelection = document.querySelector('#cancel-selection');
const selectionCount = document.querySelector('#selection-count');
const organizeAction = document.querySelector('#organize-action');
const deleteAction = document.querySelector('#delete-action');
const selectAll = document.querySelector('#select-all');
const cards = [...document.querySelectorAll('.media-card')];
const selectionTargets = [...document.querySelectorAll('.selection-target')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

let activeSource = 'creatives';

function setSource(source) {
  activeSource = source;
  const uploads = source === 'uploads';
  creativesTab.classList.toggle('active', !uploads);
  uploadsTab.classList.toggle('active', uploads);
  creativesTab.setAttribute('aria-pressed', String(!uploads));
  uploadsTab.setAttribute('aria-pressed', String(uploads));
  contextLabel.textContent = uploads ? 'UPLOADS' : 'CREATIVES';
  contextHelp.textContent = uploads ? 'Your uploaded media · newest first' : 'Generated work · newest first';
}

function clearSelectedCards() {
  cards.forEach((card) => card.classList.remove('selected'));
  selectionTargets.forEach((target) => target.setAttribute('aria-pressed', 'false'));
}

function updateSelectionCount() {
  const count = cards.filter((card) => card.classList.contains('selected')).length;
  selectionCount.textContent = `${count} selected`;
  mediaCount.textContent = body.dataset.selection === 'on' ? `${count} of 24 selected` : '24 assets';
  organizeAction.disabled = count === 0;
  deleteAction.disabled = count === 0;
}

function setSelection(enabled) {
  body.dataset.selection = enabled ? 'on' : 'off';
  commandDefault.setAttribute('aria-hidden', String(enabled));
  selectionMode.setAttribute('aria-hidden', String(!enabled));
  if (!enabled) clearSelectedCards();
  updateSelectionCount();
}

function syncSearch(searching) {
  searchInput.value = searching ? 'architecture' : '';
  clearSearch.setAttribute('aria-hidden', String(!searching));
}

function setState(state) {
  body.dataset.state = state;
  const selection = state === 'selection';
  setSource(state === 'uploads' ? 'uploads' : 'creatives');
  syncSearch(state === 'search');
  setSelection(selection);
  if (selection) {
    [0, 1].forEach((index) => {
      cards[index].classList.add('selected');
      selectionTargets[index].setAttribute('aria-pressed', 'true');
    });
    updateSelectionCount();
  }
}

creativesTab.addEventListener('click', () => setState('default'));
uploadsTab.addEventListener('click', () => setState('uploads'));
uploadAction.addEventListener('click', () => {});
selectTrigger.addEventListener('click', () => {
  body.dataset.state = activeSource === 'uploads' ? 'uploads' : 'default';
  setSelection(true);
});
cancelSelection.addEventListener('click', () => setSelection(false));
clearSearch.addEventListener('click', () => setState(activeSource === 'uploads' ? 'uploads' : 'default'));
searchInput.addEventListener('input', () => {
  const searching = searchInput.value.trim().length > 0;
  body.dataset.state = searching ? 'search' : activeSource === 'uploads' ? 'uploads' : 'default';
  clearSearch.setAttribute('aria-hidden', String(!searching));
});

document.querySelectorAll('[data-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-kind]').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  });
});

selectionTargets.forEach((target, index) => {
  target.setAttribute('aria-pressed', 'false');
  target.addEventListener('click', () => {
    const card = cards[index];
    const selected = card.classList.toggle('selected');
    target.setAttribute('aria-pressed', String(selected));
    updateSelectionCount();
  });
});

selectAll.addEventListener('click', () => {
  cards.forEach((card, index) => {
    card.classList.add('selected');
    selectionTargets[index].setAttribute('aria-pressed', 'true');
  });
  updateSelectionCount();
});

function resetCardDepth(card, link) {
  card.classList.remove('pointer-active');
  link.style.setProperty('--rx', '0deg');
  link.style.setProperty('--ry', '0deg');
  link.style.setProperty('--spot-x', '50%');
  link.style.setProperty('--spot-y', '50%');
}

cards.forEach((card) => {
  const link = card.querySelector('.media-link');
  card.addEventListener('pointermove', (event) => {
    if (reduceMotion.matches || !finePointer.matches) return;
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const rx = (0.5 - y) * 1.7;
    const ry = (x - 0.5) * 2;
    card.classList.add('pointer-active');
    link.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    link.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    link.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
    link.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
  });
  card.addEventListener('pointerleave', () => resetCardDepth(card, link));
});

reduceMotion.addEventListener?.('change', () => {
  if (!reduceMotion.matches) return;
  cards.forEach((card) => resetCardDepth(card, card.querySelector('.media-link')));
});

setState(requestedState);
window.__renderlabLibraryPrototype = { setState, setSelection, setSource };