const field = document.querySelector('[data-library-field]');
const cards = [...document.querySelectorAll('[data-card]')];
const title = document.querySelector('[data-focus-title]');
const meta = document.querySelector('[data-focus-meta]');
const actions = document.querySelector('[data-focus-actions]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const desktop = window.matchMedia('(min-width: 861px)');
const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)');

function setActions(value) {
  actions.replaceChildren(...value.split('|').map((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    return span;
  }));
}

function clearYield() {
  cards.forEach((card) => {
    card.style.setProperty('--yield-x', '0px');
    card.style.setProperty('--yield-y', '0px');
  });
}

function updateYield(activeIndex) {
  clearYield();
  if (!desktop.matches || reduced.matches) return;

  const active = cards[activeIndex];
  const activeBox = active.getBoundingClientRect();
  const ax = activeBox.left + activeBox.width / 2;
  const ay = activeBox.top + activeBox.height / 2;

  cards.forEach((card, index) => {
    if (index === activeIndex) return;
    const box = card.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const dx = cx - ax;
    const dy = cy - ay;
    const length = Math.max(1, Math.hypot(dx, dy));
    const strength = Math.min(34, 18 + length * 0.018);
    card.style.setProperty('--yield-x', `${(dx / length * strength).toFixed(1)}px`);
    card.style.setProperty('--yield-y', `${(dy / length * strength * .72).toFixed(1)}px`);
  });
}

function selectCard(index, { scroll = false } = {}) {
  const card = cards[index];
  if (!card) return;

  field.dataset.active = String(index);
  cards.forEach((item, itemIndex) => {
    const active = itemIndex === index;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  title.textContent = card.dataset.title;
  meta.textContent = card.dataset.meta;
  setActions(card.dataset.actions);
  updateYield(index);

  if (scroll && !desktop.matches) {
    card.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
  }
}

cards.forEach((card, index) => {
  card.addEventListener('pointerenter', () => {
    if (hoverFine.matches) selectCard(index);
  });
  card.addEventListener('focus', () => selectCard(index, { scroll: !desktop.matches }));
  card.addEventListener('click', () => selectCard(index, { scroll: !desktop.matches }));
});

window.addEventListener('resize', () => {
  const active = Number(field.dataset.active || '0');
  updateYield(active);
});

reduced.addEventListener?.('change', () => {
  const active = Number(field.dataset.active || '0');
  updateYield(active);
});

desktop.addEventListener?.('change', () => {
  const active = Number(field.dataset.active || '0');
  updateYield(active);
});

selectCard(0);
