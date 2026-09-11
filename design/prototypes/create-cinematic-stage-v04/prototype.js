(() => {
  const stage = document.querySelector('.stage');
  const stateLabel = document.querySelector('[data-state-label]');
  const modeCopy = document.querySelector('[data-mode-copy]');
  const footerMode = document.querySelector('[data-footer-mode]');
  const modelMeta = document.querySelector('[data-model-meta]');
  const refMeta = document.querySelector('[data-ref-meta]');
  const inspectorTitle = document.querySelector('[data-inspector-title]');
  const frameValue = document.querySelector('[data-frame-value]');
  const generateState = document.querySelector('[data-generate-state]');
  const modeButtons = [...document.querySelectorAll('[data-mode-button]')];
  const refs = [...document.querySelectorAll('[data-alias]')];
  const addButtons = [...document.querySelectorAll('[data-action="add-reference"]')];
  const advancedButtons = [...document.querySelectorAll('[data-action="advanced"], [data-action="advanced-close"]')];
  const generate = document.querySelector('[data-action="generate"]');
  const reset = document.querySelector('[data-action="reset"]');

  let order = [];
  let generatingTimer = null;
  let drag = null;
  let targetX = 0, targetY = 0, x = 0, y = 0, raf = null;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function syncRefs() {
    refs.forEach((card) => {
      const alias = card.dataset.alias;
      const index = order.indexOf(alias);
      card.hidden = index < 0;
      if (index >= 0) {
        card.dataset.slot = index === 0 ? 'primary' : 'secondary';
        card.querySelector('.ref-meta small').textContent = index === 0 ? 'PRIMARY' : 'SECONDARY';
      }
    });
    stage.dataset.referenceCount = String(order.length);
    stage.dataset.reference = order.length ? '1' : '0';
    refMeta.textContent = order.length === 0 ? 'NO REFERENCES' : order.length === 1 ? `${order[0]} · 1 SOURCE` : `${order.join(' + ')} · 2 SOURCES`;
    const more = document.querySelector('.reference-add-more');
    more.hidden = !(stage.dataset.mode === 'image' && order.length === 1 && stage.dataset.state !== 'result');
  }

  function setMode(mode) {
    stage.dataset.mode = mode;
    if (mode === 'video' && order.length > 1) order = order.slice(0, 1);
    modeButtons.forEach((button) => {
      const selected = button.dataset.modeButton === mode;
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
    modeCopy.textContent = mode.toUpperCase();
    footerMode.textContent = mode.toUpperCase();
    inspectorTitle.textContent = mode === 'image' ? 'Image controls' : 'Video controls';
    frameValue.textContent = mode === 'image' ? (order.length ? 'Original' : '1:1') : (order.length ? 'Original' : '16:9');
    modelMeta.textContent = mode === 'image' ? `FLUX · ${frameValue.textContent}` : 'VIDEO · 1080p · 5s';
    syncRefs();
  }

  function addReference() {
    if (stage.dataset.mode === 'video') {
      if (!order.length) order = ['image1'];
    } else if (order.length < 2) {
      order.push(order.includes('image1') ? 'image2' : 'image1');
    }
    syncRefs();
  }

  function makePrimary(alias) {
    if (!order.includes(alias)) return;
    order = [alias, ...order.filter((item) => item !== alias)];
    syncRefs();
  }

  function removeReference(alias) {
    order = order.filter((item) => item !== alias);
    syncRefs();
  }

  function setAdvanced(open) {
    stage.dataset.advanced = open ? 'open' : 'closed';
    document.querySelector('[data-action="advanced"]').setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setState(state) {
    stage.dataset.state = state;
    stage.classList.toggle('is-pressing', state === 'generating');
    const labels = { authoring:'READY', generating:'GENERATING', result:'RESULT' };
    stateLabel.textContent = labels[state] || state.toUpperCase();
    generateState.textContent = labels[state] || state.toUpperCase();
    generate.disabled = state === 'generating';
  }

  function doGenerate() {
    if (generatingTimer) clearTimeout(generatingTimer);
    setState('generating');
    const delay = reduceMotion ? 120 : 1450;
    generatingTimer = setTimeout(() => setState('result'), delay);
  }

  function resetAll() {
    if (generatingTimer) clearTimeout(generatingTimer);
    setState('authoring');
    setAdvanced(false);
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.modeButton)));
  addButtons.forEach((button) => button.addEventListener('click', addReference));
  advancedButtons.forEach((button) => button.addEventListener('click', () => setAdvanced(button.dataset.action === 'advanced' ? stage.dataset.advanced !== 'open' : false)));
  generate.addEventListener('click', doGenerate);
  if (reset) reset.addEventListener('click', resetAll);

  refs.forEach((card) => {
    card.querySelector('[data-action="make-primary"]').addEventListener('click', () => makePrimary(card.dataset.alias));
    card.querySelector('[data-action="remove-reference"]').addEventListener('click', () => removeReference(card.dataset.alias));
    const grab = card.querySelector('.ref-grab');
    grab.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || order.length < 2) return;
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      drag = { card, alias: card.dataset.alias, startX:event.clientX, startY:event.clientY, left:rect.left, top:rect.top };
      card.classList.add('dragging');
    });
  });

  document.addEventListener('mousemove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.card.style.transform = `translate3d(${dx}px,${dy}px,70px) rotateZ(0deg) scale(1.03)`;
  });
  document.addEventListener('mouseup', (event) => {
    if (!drag) return;
    const other = refs.find((card) => !card.hidden && card !== drag.card);
    if (other) {
      const r = other.getBoundingClientRect();
      const inside = event.clientX >= r.left - 30 && event.clientX <= r.right + 30 && event.clientY >= r.top - 30 && event.clientY <= r.bottom + 30;
      if (inside) makePrimary(drag.alias);
    }
    drag.card.classList.remove('dragging');
    drag.card.style.transform = '';
    drag = null;
  });

  function tick() {
    x += (targetX - x) * .08;
    y += (targetY - y) * .08;
    stage.style.setProperty('--px', x.toFixed(3));
    stage.style.setProperty('--py', y.toFixed(3));
    if (Math.abs(targetX-x) > .002 || Math.abs(targetY-y) > .002) raf = requestAnimationFrame(tick); else raf = null;
  }
  function setPointer(nx, ny) {
    targetX = nx; targetY = ny;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  stage.addEventListener('pointermove', (event) => {
    if (reduceMotion || event.pointerType === 'touch' || event.target.closest('button,textarea,.precision-inspector')) { setPointer(0,0); return; }
    const rect = stage.getBoundingClientRect();
    setPointer(((event.clientX-rect.left)/rect.width-.5)*2, ((event.clientY-rect.top)/rect.height-.5)*2);
  });
  stage.addEventListener('pointerleave', () => setPointer(0,0));

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  const state = params.get('state');
  if (mode === 'video') setMode('video'); else setMode('image');
  if (state === 'references') { addReference(); if (stage.dataset.mode === 'image') addReference(); }
  if (state === 'advanced') { addReference(); setAdvanced(true); }
  if (state === 'generating') { addReference(); setState('generating'); }
  if (state === 'result') { addReference(); setState('result'); }
  syncRefs();

  window.__renderlabPrototype = { stage, setMode, addReference, makePrimary, removeReference, setAdvanced, setState, doGenerate, resetAll, getOrder:() => [...order] };
})();
