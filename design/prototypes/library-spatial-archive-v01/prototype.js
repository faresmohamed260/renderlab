const body = document.body;
const tabButtons = [...document.querySelectorAll('[data-tab-button]')];
const kindButtons = [...document.querySelectorAll('[data-kind]')];
const mediaCards = [...document.querySelectorAll('.media-card')];
const discoveryState = document.querySelector('#discovery-state');
const selectionState = document.querySelector('#selection-state');
const selectTrigger = document.querySelector('#select-trigger');
const cancelSelection = document.querySelector('#cancel-selection');
const selectPage = document.querySelector('#select-page');
const selectionCount = document.querySelector('#selection-count');
const selectionTargets = [...document.querySelectorAll('.selection-target')];
const organizeAction = document.querySelector('#organize-action');
const deleteAction = document.querySelector('#delete-action');
const uploadAction = document.querySelector('#upload-action');
const contextLabel = document.querySelector('#context-label');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const selectedIds = new Set();

function syncQuery(name, value, removeValue = null) {
  const url = new URL(window.location.href);
  if (value === removeValue || value == null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
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
  syncQuery('tab', next, 'creatives');
}

function setKind(kind) {
  const next = ['all', 'image', 'video'].includes(kind) ? kind : 'all';
  body.dataset.kind = next;
  kindButtons.forEach((button) => {
    const active = button.dataset.kind === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  mediaCards.forEach((card) => {
    card.hidden = next !== 'all' && card.dataset.kindCard !== next;
  });
  syncQuery('kind', next, 'all');
}

function updateSelectionCount() {
  const visibleCards = mediaCards.filter((card) => !card.hidden);
  const count = selectedIds.size;
  selectionCount.textContent = count === 0 ? 'Select media on this page' : `${count} selected on this page`;
  organizeAction.disabled = count === 0;
  deleteAction.disabled = count === 0;
  deleteAction.textContent = count ? `Delete ${count}` : 'Delete';
  const all = visibleCards.length > 0 && visibleCards.every((card) => selectedIds.has(card.dataset.cardId));
  selectPage.textContent = all ? 'Clear page' : `Select page (${visibleCards.length})`;
}

function syncCardSelection(card, selected) {
  if (!card || card.hidden) return;
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
  syncQuery('select', '1');
}

function exitSelection() {
  body.dataset.selection = 'off';
  discoveryState.hidden = false;
  selectionState.hidden = true;
  mediaCards.forEach((card) => syncCardSelection(card, false));
  syncQuery('select', null);
}

tabButtons.forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tabButton)));
kindButtons.forEach((button) => button.addEventListener('click', () => setKind(button.dataset.kind)));
selectTrigger.addEventListener('click', enterSelection);
cancelSelection.addEventListener('click', exitSelection);

selectPage.addEventListener('click', () => {
  const visibleCards = mediaCards.filter((card) => !card.hidden);
  const allSelected = visibleCards.length > 0 && visibleCards.every((card) => selectedIds.has(card.dataset.cardId));
  visibleCards.forEach((card) => syncCardSelection(card, !allSelected));
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
    event.preventDefault();
    if (body.dataset.selection !== 'on') return;
    const card = link.closest('.media-card');
    syncCardSelection(card, card.querySelector('.selection-target').getAttribute('aria-pressed') !== 'true');
    updateSelectionCount();
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
    const rx = (0.5 - py) * 2.6;
    const ry = (px - 0.5) * 3.6;
    link.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-2px)`;
    link.style.setProperty('--spot-x', `${Math.round(px * 100)}%`);
    link.style.setProperty('--spot-y', `${Math.round(py * 100)}%`);
  });
  card.addEventListener('pointerleave', () => resetTilt(card));
});

function hydrate() {
  const query = new URLSearchParams(window.location.search);
  setTab(query.get('tab') || 'creatives');
  setKind(query.get('kind') || 'all');
  if (query.get('select') === '1') {
    enterSelection();
    syncCardSelection(mediaCards[0], true);
    syncCardSelection(mediaCards[1], true);
    updateSelectionCount();
  }
}

hydrate();
