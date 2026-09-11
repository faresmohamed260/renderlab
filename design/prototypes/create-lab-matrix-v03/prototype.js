(() => {
  const instrument = document.querySelector('.instrument');
  const shell = document.querySelector('.instrument-shell');
  const modeButtons = [...document.querySelectorAll('[data-mode]')].filter((el) => el.matches('button'));
  const status = document.querySelector('.status-value');
  const refObject = document.querySelector('.reference-object');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    mode: 'image', reference: false, advanced: false, result: false,
    pointerX: 0, pointerY: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0,
    refX: -92, refY: 38, refVX: 0, refVY: 0, refTargetX: 0, refTargetY: 0, running: true,
  };

  const setStatus = (value) => { status.textContent = value.toUpperCase(); };

  function setMode(mode) {
    state.mode = mode;
    instrument.dataset.mode = mode;
    modeButtons.forEach((button) => button.setAttribute('aria-checked', String(button.dataset.mode === mode)));
    document.querySelector('.mode-readout span').textContent = mode === 'video' ? 'CREATE VIDEO' : 'CREATE IMAGE';
    document.querySelector('.mode-readout small').textContent = mode === 'video' ? '02 / MOTION' : '01 / STILL';
    if (!state.result) setStatus(mode === 'video' ? 'VIDEO MORPH' : 'IMAGE MORPH');
    window.setTimeout(() => { if (!state.result) setStatus('AUTHORING'); }, reduceMotion ? 0 : 760);
  }

  function addReference() {
    state.reference = true;
    instrument.dataset.reference = '1';
    state.refX = reduceMotion ? 0 : -118;
    state.refY = reduceMotion ? 0 : 54;
    state.refVX = reduceMotion ? 0 : 8.5;
    state.refVY = reduceMotion ? 0 : -4.5;
    setStatus('REFERENCE ENTER');
    window.setTimeout(() => setStatus('AUTHORING'), reduceMotion ? 0 : 1100);
  }

  function removeReference() {
    state.reference = false;
    instrument.dataset.reference = '0';
    state.refTargetX = -110;
    state.refTargetY = 36;
    setStatus('REFERENCE EXIT');
    window.setTimeout(() => setStatus('AUTHORING'), reduceMotion ? 0 : 700);
  }

  function toggleAdvanced() {
    state.advanced = !state.advanced;
    instrument.dataset.advanced = state.advanced ? 'open' : 'closed';
    document.querySelector('[data-action="advanced"]').setAttribute('aria-expanded', String(state.advanced));
    setStatus(state.advanced ? 'ADVANCED UNFOLD' : 'ADVANCED FOLD');
    window.setTimeout(() => setStatus('AUTHORING'), reduceMotion ? 0 : 760);
  }

  function generate() {
    if (state.result) {
      reset(false);
      window.setTimeout(generate, reduceMotion ? 0 : 240);
      return;
    }
    state.advanced = false;
    instrument.dataset.advanced = 'closed';
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
    instrument.classList.remove('is-charging');
    if (full) {
      state.reference = false;
      instrument.dataset.reference = '0';
      setMode('image');
    }
    setStatus('AUTHORING');
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelector('[data-action="reference"]').addEventListener('click', addReference);
  document.querySelector('[data-action="reference-remove"]').addEventListener('click', removeReference);
  document.querySelector('[data-action="advanced"]').addEventListener('click', toggleAdvanced);
  document.querySelector('[data-action="generate"]').addEventListener('click', generate);
  document.querySelector('[data-action="reset"]').addEventListener('click', () => reset(true));

  shell.addEventListener('pointermove', (event) => {
    if (reduceMotion || event.pointerType === 'touch') return;
    if (event.target.closest('button, textarea, a')) {
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

      if (state.reference) {
        const k = .075;
        const c = .76;
        state.refVX = (state.refVX + (state.refTargetX - state.refX) * k) * c;
        state.refVY = (state.refVY + (state.refTargetY - state.refY) * k) * c;
        state.refX += state.refVX;
        state.refY += state.refVY;
        const velocity = Math.min(1, Math.hypot(state.refVX, state.refVY) / 10);
        refObject.style.transform = `translate3d(${state.refX}px,${state.refY}px,60px) rotateY(${state.refVX * -.55}deg) rotateZ(${state.refVX * -.28}deg) scale(${.98 + velocity * .02})`;
      }
    } else if (state.reference) {
      refObject.style.transform = 'translate3d(0,0,0) scale(1)';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.__renderlabPrototype = { setMode, addReference, removeReference, toggleAdvanced, generate, reset };
})();
