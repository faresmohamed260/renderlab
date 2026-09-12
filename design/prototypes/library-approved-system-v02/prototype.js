const params = new URLSearchParams(window.location.search);
const concepts = new Set(['gallery', 'index', 'ledger']);
const states = new Set(['default', 'uploads', 'search', 'selection']);
const concept = concepts.has(params.get('concept')) ? params.get('concept') : 'gallery';
const requestedState = states.has(params.get('state')) ? params.get('state') : 'default';
const body = document.body;
const conceptNames = { gallery: 'GALLERY RAIL', index: 'INDEX STRIP', ledger: 'MEDIA LEDGER' };

body.dataset.concept = concept;
document.querySelector('#concept-label').textContent = conceptNames[concept];

const creativesTab = document.querySelector('#creatives-tab');
const uploadsTab = document.querySelector('#uploads-tab');
const uploadAction = document.querySelector('#upload-action');
const searchInput = document.querySelector('#library-search');
const activeQuery = document.querySelector('#active-query');
const contextLabel = document.querySelector('#context-label');
const contextHelp = document.querySelector('#context-help');
const selectTrigger = document.querySelector('#select-trigger');
const cancelSelection = document.querySelector('#cancel-selection');
const selectionCount = document.querySelector('#selection-count');
const organizeAction = document.querySelector('#organize-action');
const deleteAction = document.querySelector('#delete-action');
const clearSearch = document.querySelector('#clear-search');
const selectAll = document.querySelector('#select-all');
const cards = [...document.querySelectorAll('.media-card')];
const selectionTargets = [...document.querySelectorAll('.selection-target')];

function setSource(source) {
  const uploads = source === 'uploads';
  creativesTab.classList.toggle('active', !uploads);
  uploadsTab.classList.toggle('active', uploads);
  creativesTab.setAttribute('aria-pressed', String(!uploads));
  uploadsTab.setAttribute('aria-pressed', String(uploads));
  contextLabel.textContent = uploads ? 'UPLOADS / RECENT' : 'CREATIVES / RECENT';
  contextHelp.textContent = uploads ? 'Your uploaded media · newest first' : 'Generated work · newest first';
}

function clearSelectedCards() {
  cards.forEach((card) => card.classList.remove('selected'));
  selectionTargets.forEach((target) => target.setAttribute('aria-pressed', 'false'));
}

function updateSelectionCount() {
  const count = cards.filter((card) => card.classList.contains('selected')).length;
  selectionCount.textContent = `${count} selected`;
  organizeAction.disabled = count === 0;
  deleteAction.disabled = count === 0;
}

function setSelection(enabled) {
  body.dataset.selection = enabled ? 'on' : 'off';
  if (!enabled) clearSelectedCards();
  updateSelectionCount();
}

function setState(state) {
  body.dataset.state = state;
  setSelection(state === 'selection');
  setSource(state === 'uploads' ? 'uploads' : 'creatives');
  searchInput.value = state === 'search' ? 'architecture' : '';
  if (state === 'selection') {
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
  body.dataset.state = body.dataset.state === 'uploads' ? 'uploads' : 'default';
  setSelection(true);
});
cancelSelection.addEventListener('click', () => setSelection(false));
clearSearch.addEventListener('click', () => setState('default'));
searchInput.addEventListener('input', () => {
  const hasQuery = searchInput.value.trim().length > 0;
  body.dataset.state = hasQuery ? 'search' : 'default';
});

document.querySelectorAll('[data-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-kind]').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    if (button.dataset.kind !== 'all') {
      body.dataset.state = 'search';
      searchInput.value = button.dataset.kind;
      activeQuery.querySelector('strong').textContent = `“${button.dataset.kind}”`;
    }
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

setState(requestedState);
window.__renderlabLibraryPrototype = { setState, setSelection, concept };