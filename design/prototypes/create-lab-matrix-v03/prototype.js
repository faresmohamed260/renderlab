(() => {
  const instrument = document.querySelector('.instrument');
  const shell = document.querySelector('.instrument-shell');
  const modeButtons = [...document.querySelectorAll('[data-mode]')].filter((el) => el.matches('button'));
  const status = document.querySelector('.status-value');
  const referenceObjects = [...document.querySelectorAll('[data-reference-object]')];
  const referenceCount = document.querySelector('.reference-count');
  const addReferenceButtons = [...document.querySelectorAll('[data-action="reference-add"]')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixtures = [
    {
      nodeIndex: 0,
      label: 'Mountain light study',
      image: 'https://images.unsplash.com/photo-1771029580794-255d3e82680e?auto=format&fit=crop&w=900&q=84',
    },
    {
      nodeIndex: 1,
      label: 'Atmosphere study',
      image: 'https://images.unsplash.com/photo-1773176563345-5e8685906a21?auto=format&fit=crop&w=900&q=84',
    },
  ];
  const state = {
    mode: 'image', refs: [], nextAlias: 1, advanced: false, result: false,
    pointerX: 0, pointerY: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0,
    draggedAlias: null, dragPointerId: null, dragStartX: 0, dragStartY: 0,
    dragTargetAlias: null, dragMoved: false, running: true,
  };

  const setStatus = (value) => { status.textContent = value.toUpperCase(); };

  function activeNode(alias) {
    return referenceObjects.find((node) => node.dataset.alias === alias && !node.hidden) ?? null;
  }

  function referenceSnapshot() {
    return new Map(state.refs.map((ref) => {
      const node = activeNode(ref.alias);
      return [ref.alias, node?.getBoundingClientRect() ?? null];
    }));
  }

  function animateEntry(node, index) {
    if (!node || reduceMotion) return;
    const direction = index === 0 ? -1 : 1;
    node.animate([
      { opacity: 0, transform: `translate3d(${direction * 92}px,38px,72px) rotateY(${direction * -12}deg) rotateZ(${direction * -5}deg) scale(.82)` },
      { opacity: 1, transform: `translate3d(${direction * -8}px,-4px,64px) rotateY(${direction * 2}deg) rotateZ(${direction * 1.2}deg) scale(1.025)`, offset: .62 },
      { opacity: 1, transform: `translate3d(${direction * 3}px,2px,58px) rotateY(${direction * -.6}deg) rotateZ(${direction * -.3}deg) scale(.994)`, offset: .83 },
      { opacity: 1, transform: 'none' },
    ], { duration: 760, easing: 'linear' });
  }

  function animateReorder(before) {
    if (reduceMotion) return;
    state.refs.forEach((ref) => {
      const node = activeNode(ref.alias);
      const previous = before.get(ref.alias);
      if (!node || !previous) return;
      requestAnimationFrame(() => {
        const next = node.getBoundingClientRect();
        const dx = previous.left - next.left;
        const dy = previous.top - next.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        node.animate([
          { translate: `${dx}px ${dy}px`, scale: .985 },
          { translate: `${dx * -.05}px ${dy * -.05}px`, scale: 1.018, offset: .72 },
          { translate: '0 0', scale: 1 },
        ], { duration: 560, easing: 'cubic-bezier(.18,.88,.22,1.08)' });
      });
    });
  }

  function syncReferences() {
    instrument.dataset.reference = state.refs.length ? '1' : '0';
    instrument.dataset.referenceCount = String(state.refs.length);
    const max = state.mode === 'image' ? 2 : 1;
    referenceCount.textContent = `${state.refs.length} / ${max}`;

    referenceObjects.forEach((node, nodeIndex) => {
      const ref = state.refs.find((item) => item.nodeIndex === nodeIndex);
      node.draggable = false;
      if (!ref) {
        node.hidden = true;
        node.dataset.slot = 'hidden';
        node.removeAttribute('data-alias');
        node.style.translate = '';
        return;
      }

      const order = state.refs.indexOf(ref);
      const slot = order === 0 ? 'primary' : 'secondary';
      node.hidden = false;
      node.dataset.slot = slot;
      node.dataset.alias = ref.alias;
      node.setAttribute('aria-label', `${slot === 'primary' ? 'Primary' : 'Secondary'} reference @${ref.alias}: ${ref.label}`);
      node.querySelector('img').src = ref.image;
      node.querySelector('.reference-index').textContent = `@${ref.alias}`;
      node.querySelector('.reference-role').textContent = slot.toUpperCase();

      const primary = node.querySelector('[data-action="make-primary"]');
      const remove = node.querySelector('[data-action="reference-remove"]');
      primary.hidden = slot === 'primary' || state.mode !== 'image';
      primary.setAttribute('aria-label', `Make @${ref.alias} primary`);
      remove.setAttribute('aria-label', `Remove @${ref.alias}`);
    });
  }

  function addReference() {
    const max = state.mode === 'image' ? 2 : 1;
    if (state.refs.length >= max) return;
    const usedNodes = new Set(state.refs.map((ref) => ref.nodeIndex));
    const fixture = fixtures.find((candidate) => !usedNodes.has(candidate.nodeIndex));
    if (!fixture) return;

    const ref = { ...fixture, alias: `image${state.nextAlias++}` };
    state.refs = [...state.refs, ref];
    syncReferences();
    animateEntry(activeNode(ref.alias), state.refs.length - 1);
    setStatus(state.refs.length > 1 ? 'REFERENCE PAIR' : 'REFERENCE ENTER');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 980);
  }

  function removeReference(alias) {
    const node = activeNode(alias);
    const finish = () => {
      const before = referenceSnapshot();
      state.refs = state.refs.filter((ref) => ref.alias !== alias);
      syncReferences();
      animateReorder(before);
      setStatus(state.refs.length ? 'REFERENCE SETTLE' : 'REFERENCE EXIT');
      window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 620);
    };
    if (!node || reduceMotion) return finish();
    node.animate([
      { opacity: 1, translate: '0 0', scale: 1 },
      { opacity: .75, translate: '10px -3px', scale: 1.01, offset: .3 },
      { opacity: 0, translate: '76px 24px', scale: .88 },
    ], { duration: 360, easing: 'cubic-bezier(.4,0,.7,.2)' }).finished.then(finish);
  }

  function moveAliasBefore(alias, targetAlias) {
    if (state.mode !== 'image' || alias === targetAlias) return;
    const from = state.refs.findIndex((ref) => ref.alias === alias);
    const target = state.refs.findIndex((ref) => ref.alias === targetAlias);
    if (from < 0 || target < 0) return;
    const before = referenceSnapshot();
    const next = [...state.refs];
    const [moved] = next.splice(from, 1);
    const nextTarget = next.findIndex((ref) => ref.alias === targetAlias);
    next.splice(Math.max(0, nextTarget), 0, moved);
    state.refs = next;
    syncReferences();
    animateReorder(before);
    setStatus('REFERENCE REORDER');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 620);
  }

  function makePrimary(alias) {
    if (state.mode !== 'image') return;
    const index = state.refs.findIndex((ref) => ref.alias === alias);
    if (index <= 0) return;
    const before = referenceSnapshot();
    state.refs = [state.refs[index], ...state.refs.filter((_, i) => i !== index)];
    syncReferences();
    animateReorder(before);
    setStatus('PRIMARY EXCHANGE');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 620);
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === 'video' && state.refs.length > 1) state.refs = state.refs.slice(0, 1);
    instrument.dataset.mode = mode;
    modeButtons.forEach((button) => button.setAttribute('aria-checked', String(button.dataset.mode === mode)));
    document.querySelector('.mode-readout span').textContent = mode === 'video' ? 'CREATE VIDEO' : 'CREATE IMAGE';
    document.querySelector('.mode-readout small').textContent = mode === 'video' ? '02 / MOTION' : '01 / STILL';
    syncReferences();
    if (!state.result) setStatus(mode === 'video' ? 'VIDEO MORPH' : 'IMAGE MORPH');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 760);
  }

  function toggleAdvanced() {
    state.advanced = !state.advanced;
    instrument.dataset.advanced = state.advanced ? 'open' : 'closed';
    document.querySelector('[data-action="advanced"]').setAttribute('aria-expanded', String(state.advanced));
    setStatus(state.advanced ? 'ADVANCED UNFOLD' : 'ADVANCED FOLD');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 760);
  }

  function generate() {
    if (state.result) {
      reset(false);
      window.setTimeout(generate, reduceMotion ? 0 : 240);
      return;
    }
    state.advanced = false;
    instrument.dataset.advanced = 'closed';
    document.querySelector('[data-action="advanced"]').setAttribute('aria-expanded', 'false');
    instrument.classList.add('is-charging');
    setStatus('ACTUATE');
    window.setTimeout(() => {
      instrument.classList.remove('is-charging');
      state.result = true;
      instrument.dataset.state = 'result';
      setStatus('RESULT');
    }, reduceMotion ? 50 : 1150);
  }

  function reset(full = true) {
    state.result = false;
    state.advanced = false;
    instrument.dataset.state = 'authoring';
    instrument.dataset.advanced = 'closed';
    document.querySelector('[data-action="advanced"]').setAttribute('aria-expanded', 'false');
    instrument.classList.remove('is-charging');
    if (full) {
      state.refs = [];
      state.nextAlias = 1;
      setMode('image');
    } else {
      syncReferences();
    }
    setStatus('AUTHORING');
  }

  function pointerTargetAlias(draggedAlias, clientX, clientY) {
    for (const ref of state.refs) {
      if (ref.alias === draggedAlias) continue;
      const node = activeNode(ref.alias);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return ref.alias;
      }
    }
    return null;
  }

  function clearPointerExchange(node, pointerId) {
    if (node?.hasPointerCapture?.(pointerId)) node.releasePointerCapture(pointerId);
    if (node) {
      node.style.translate = '';
      node.classList.remove('dragging');
    }
    referenceObjects.forEach((item) => item.classList.remove('drag-target'));
    state.draggedAlias = null;
    state.dragPointerId = null;
    state.dragTargetAlias = null;
    state.dragMoved = false;
  }

  function finishPointerExchange(node, event, cancelled = false) {
    if (state.dragPointerId !== event.pointerId || state.draggedAlias !== node.dataset.alias) return;
    const alias = state.draggedAlias;
    const targetAlias = state.dragTargetAlias;
    const moved = state.dragMoved;
    clearPointerExchange(node, event.pointerId);
    if (!cancelled && moved && targetAlias) {
      moveAliasBefore(alias, targetAlias);
    } else if (!state.result) {
      setStatus('AUTHORING');
    }
    event.preventDefault();
  }

  addReferenceButtons.forEach((button) => button.addEventListener('click', addReference));
  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  referenceObjects.forEach((node) => {
    node.addEventListener('dragstart', (event) => event.preventDefault());
    node.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0 || state.mode !== 'image' || state.refs.length < 2) return;
      if (!node.dataset.alias || event.target.closest('button')) return;
      state.draggedAlias = node.dataset.alias;
      state.dragPointerId = event.pointerId;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragTargetAlias = null;
      state.dragMoved = false;
      node.setPointerCapture(event.pointerId);
      node.classList.add('dragging');
      setStatus('REFERENCE HOLD');
      event.preventDefault();
    });
    node.addEventListener('pointermove', (event) => {
      if (state.dragPointerId !== event.pointerId || state.draggedAlias !== node.dataset.alias) return;
      const dx = event.clientX - state.dragStartX;
      const dy = event.clientY - state.dragStartY;
      if (!state.dragMoved && Math.hypot(dx, dy) < 5) return;
      state.dragMoved = true;
      node.style.translate = `${dx}px ${dy}px`;
      state.dragTargetAlias = pointerTargetAlias(state.draggedAlias, event.clientX, event.clientY);
      referenceObjects.forEach((item) => item.classList.toggle('drag-target', item.dataset.alias === state.dragTargetAlias));
      setStatus(state.dragTargetAlias ? 'REFERENCE EXCHANGE' : 'REFERENCE DRAG');
      event.preventDefault();
    });
    node.addEventListener('pointerup', (event) => finishPointerExchange(node, event, false));
    node.addEventListener('pointercancel', (event) => finishPointerExchange(node, event, true));
    node.querySelector('[data-action="make-primary"]').addEventListener('click', (event) => {
      event.stopPropagation();
      makePrimary(node.dataset.alias);
    });
    node.querySelector('[data-action="reference-remove"]').addEventListener('click', (event) => {
      event.stopPropagation();
      removeReference(node.dataset.alias);
    });
  });
  document.querySelector('[data-action="advanced"]').addEventListener('click', toggleAdvanced);
  document.querySelector('[data-action="generate"]').addEventListener('click', generate);
  document.querySelector('[data-action="reset"]').addEventListener('click', () => reset(true));

  shell.addEventListener('pointermove', (event) => {
    if (reduceMotion || event.pointerType === 'touch') return;
    if (event.target.closest('button, textarea, a, [data-reference-object]')) {
      state.targetX = 0;
      state.targetY = 0;
      return;
    }
    const rect = shell.getBoundingClientRect();
    state.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    state.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
  });
  shell.addEventListener('pointerleave', () => { state.targetX = 0; state.targetY = 0; });

  function tick() {
    if (!state.running) return;
    if (!reduceMotion) {
      const stiffness = .072;
      const damping = .74;
      state.velocityX = (state.velocityX + (state.targetX - state.pointerX) * stiffness) * damping;
      state.velocityY = (state.velocityY + (state.targetY - state.pointerY) * stiffness) * damping;
      state.pointerX += state.velocityX;
      state.pointerY += state.velocityY;
      instrument.style.setProperty('--field-x', `${state.pointerX * 4}px`);
      instrument.style.setProperty('--field-y', `${state.pointerY * 3}px`);
      instrument.style.setProperty('--ry', `${state.pointerX * 1.4}deg`);
      instrument.style.setProperty('--rx', `${state.pointerY * -1.05}deg`);

      document.querySelectorAll('[data-depth]').forEach((plane) => {
        const d = Number(plane.dataset.depth || 0);
        const x = state.pointerX * d * 13;
        const y = state.pointerY * d * 9;
        plane.style.translate = `${x}px ${y}px`;
      });
    }
    requestAnimationFrame(tick);
  }

  syncReferences();
  requestAnimationFrame(tick);
  window.__renderlabPrototype = {
    setMode, addReference, removeReference, makePrimary, moveAliasBefore, toggleAdvanced, generate, reset,
    getReferenceOrder: () => state.refs.map((ref) => ref.alias),
  };
})();