const body = document.body;
const directionButtons = [...document.querySelectorAll('[data-set-direction]')];
const tabButtons = [...document.querySelectorAll('[data-tab-button]')];
const kindButtons = [...document.querySelectorAll('[data-kind]')];
const discoveryState = document.querySelector('#discovery-state');
const selectionState = document.querySelector('#selection-state');
const selectTrigger = document.querySelector('#select-trigger');
const cancelSelection = document.querySelector('#cancel-selection');
const selectPage = document.querySelector('#select-page');
const selectionCount = document.querySelector('#selection-count');
const selectionTargets = [...document.querySelectorAll('.selection-target')];
const mediaCards = [...document.querySelectorAll('.media-card')];
const organizeAction = document.querySelector('#organize-action');
const deleteAction = document.querySelector('#delete-action');
const uploadAction = document.querySelector('[data-upload-action]');
const contextLabel = document.querySelector('[data-context-label]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const selectedIds = new Set();

function setDirection(direction) {
  const allowed = new Set(['index', 'ledger', 'lens']);
  const next = allowed.has(direction) ? direction : 'index';
  body.dataset.direction = next;
  document.querySelector('#command-surface').dataset.layout =
    next === 'index' ? 'single-plane' : next === 'ledger' ? 'ledger' : 'lens';
  directionButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.setDirection === next));
  });
  const url = new URL(window.location.href);
  url.searchParams.set('dir', next);
  history.replaceState(null, '', url);
}

function setTab(tab) {
  const next = tab === 'uploads' ? 'uploads' : 'creatives';
  body.dataset.tab = next;
  tabButtons.forEach((button) => {
    const active = button.dataset.tabButton === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  uploadAction.hidden = next !== 'uploads';
  contextLabel.textContent = `${next.toUpperCase()} / NEWEST`;
}

function setKind(kind) {
  const next = ['all', 'image', 'video'].includes(kind) ? kind : 'all';
  kindButtons.forEach((button) => {
    const active = button.dataset.kind === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateSelectionCount() {
  const count = selectedIds.size;
  selectionCount.textContent = count === 0
    ? 'Select media on this page'
    : `${count} selected on this page`;
  organizeAction.disabled = count === 0;
  deleteAction.disabled = count === 0;
  deleteAction.textContent = count ? `Delete ${count}` : 'Delete';
  const all = count === mediaCards.length && mediaCards.length > 0;
  selectPage.textContent = all ? 'Clear page' : `Select page (${mediaCards.length})`;
}

function syncCardSelection(card, selected) {
  const id = card.dataset.cardId;
  const target = card.querySelector('.selection-target');
  if (selected) selectedIds.add(id);
  else selectedIds.delete(id);
  card.classList.toggle('is-selected', selected);
  target.setAttribute('aria-pressed', String(selected));
}

function enterSelection() {
  body.dataset.selection = 'on';
  discoveryState.hidden = true;
  selectionState.hidden = false;
  updateSelectionCount();
  const url = new URL(window.location.href);
  url.searchParams.set('select', '1');
  history.replaceState(null, '', url);
}

function exitSelection() {
  body.dataset.selection = 'off';
  discoveryState.hidden = false;
  selectionState.hidden = true;
  mediaCards.forEach((card) => syncCardSelection(card, false));
  const url = new URL(window.location.href);
  url.searchParams.delete('select');
  history.replaceState(null, '', url);
}

directionButtons.forEach((button) => {
  button.addEventListener('click', () => setDirection(button.dataset.setDirection));
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setTab(button.dataset.tabButton));
});

kindButtons.forEach((button) => {
  button.addEventListener('click', () => setKind(button.dataset.kind));
});

selectTrigger.addEventListener('click', enterSelection);
cancelSelection.addEventListener('click', exitSelection);

selectPage.addEventListener('click', () => {
  const allSelected = selectedIds.size === mediaCards.length;
  mediaCards.forEach((card) => syncCardSelection(card, !allSelected));
  updateSelectionCount();
});

selectionTargets.forEach((target) => {
  target.addEventListener('click', () => {
    const card = target.closest('.media-card');
    syncCardSelection(card, target.getAttribute('aria-pressed') !== 'true');
    updateSelectionCount();
  });
});

document.querySelectorAll('.media-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (body.dataset.selection === 'on') {
      event.preventDefault();
      const card = link.closest('.media-card');
      const target = card.querySelector('.selection-target');
      syncCardSelection(card, target.getAttribute('aria-pressed') !== 'true');
      updateSelectionCount();
      return;
    }
    event.preventDefault();
  });
});

function resetTilt(card) {
  const link = card.querySelector('.media-link');
  link.style.transform = '';
  link.style.setProperty('--spot-x', '50%');
  link.style.setProperty('--spot-y', '50%');
}

mediaCards.forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches || body.dataset.selection === 'on') return;
    const link = card.querySelector('.media-link');
    const box = card.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    const rx = (0.5 - py) * 3.2;
    const ry = (px - 0.5) * 4.2;
    link.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-2px)`;
    link.style.setProperty('--spot-x', `${Math.round(px * 100)}%`);
    link.style.setProperty('--spot-y', `${Math.round(py * 100)}%`);
  });
  card.addEventListener('pointerleave', () => resetTilt(card));
});

function hydrateFromQuery() {
  const query = new URLSearchParams(window.location.search);
  setDirection(query.get('dir') || 'index');
  setTab(query.get('tab') || 'creatives');
  setKind(query.get('kind') || 'all');
  if (query.get('select') === '1') {
    enterSelection();
    syncCardSelection(mediaCards[0], true);
    syncCardSelection(mediaCards[1], true);
    updateSelectionCount();
  }
}

hydrateFromQuery();
