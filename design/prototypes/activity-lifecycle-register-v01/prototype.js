(() => {
  const params = new URLSearchParams(window.location.search);
  const body = document.body;
  const conceptPanels = [...document.querySelectorAll('[data-concept-panel]')];
  const conceptButtons = [...document.querySelectorAll('[data-concept-button]')];
  const modeButtons = [...document.querySelectorAll('[data-mode-button]')];
  const loadingView = document.querySelector('[data-loading-view]');
  const emptyView = document.querySelector('[data-empty-view]');
  const liveRegister = document.querySelector('[data-live-register]');
  const pagination = document.querySelector('.pagination');
  const primaryJob = document.querySelector('#primary-job');
  const primaryStatus = document.querySelector('[data-primary-status]');
  const primaryNote = document.querySelector('[data-primary-note]');
  const primaryActions = document.querySelector('[data-primary-actions]');
  const primaryFault = document.querySelector('[data-primary-fault]');
  const cancelConfirm = document.querySelector('[data-cancel-confirm]');

  const validConcepts = new Set(['register', 'ledger', 'fold']);
  const validModes = new Set(['full', 'loading', 'empty']);
  const nonterminal = new Set(['queued', 'preparing', 'running', 'cancelling', 'persisting']);
  let cancelTimer = null;

  function button(content, attrs = '') {
    return `<button class="button quiet" type="button" ${attrs}>${content}</button>`;
  }

  function setConcept(next) {
    const concept = validConcepts.has(next) ? next : 'register';
    body.dataset.concept = concept;
    conceptPanels.forEach((panel) => { panel.hidden = panel.dataset.conceptPanel !== concept; });
    conceptButtons.forEach((control) => control.setAttribute('aria-pressed', String(control.dataset.conceptButton === concept)));
  }

  function setMode(next) {
    const mode = validModes.has(next) ? next : 'full';
    body.dataset.mode = mode;
    const full = mode === 'full';
    conceptPanels.forEach((panel) => {
      const matchesConcept = panel.dataset.conceptPanel === body.dataset.concept;
      panel.hidden = !full || !matchesConcept;
    });
    loadingView.hidden = mode !== 'loading';
    emptyView.hidden = mode !== 'empty';
    liveRegister.hidden = !full;
    pagination.hidden = !full;
    modeButtons.forEach((control) => control.setAttribute('aria-pressed', String(control.dataset.modeButton === mode)));
  }

  function renderActions(status) {
    if (status === 'running' || status === 'preparing' || status === 'queued') {
      primaryActions.innerHTML = button('Cancel', 'data-cancel-trigger');
    } else if (status === 'succeeded') {
      primaryActions.innerHTML = '<a class="button primary" href="#">View result</a>' + button('Run again');
    } else if (status === 'failed') {
      primaryActions.innerHTML = button('Retry');
    } else {
      primaryActions.innerHTML = '';
    }
  }

  function setLifecycle(next, { settle = true } = {}) {
    const allowed = new Set(['queued', 'preparing', 'running', 'cancelling', 'persisting', 'succeeded', 'failed', 'cancelled']);
    if (!allowed.has(next)) throw new Error(`Unsupported prototype lifecycle: ${next}`);
    if (cancelTimer) {
      window.clearTimeout(cancelTimer);
      cancelTimer = null;
    }

    const labels = {
      queued: ['Queued', 'Active'],
      preparing: ['Preparing', 'Active'],
      running: ['Running', 'Active'],
      cancelling: ['Cancelling', 'Active'],
      persisting: ['Persisting', 'Active'],
      succeeded: ['Succeeded', 'Complete'],
      failed: ['Failed', 'Needs action'],
      cancelled: ['Cancelled', 'Stopped'],
    };

    primaryJob.dataset.status = next;
    primaryJob.classList.toggle('is-active', nonterminal.has(next));
    primaryJob.classList.toggle('is-terminal', !nonterminal.has(next));
    primaryJob.classList.toggle('is-failed', next === 'failed');
    primaryStatus.textContent = labels[next][0];
    primaryNote.textContent = labels[next][1];
    primaryFault.hidden = next !== 'failed';
    cancelConfirm.hidden = true;
    renderActions(next);

    primaryJob.classList.remove('just-settled');
    if (settle && !nonterminal.has(next)) {
      void primaryJob.offsetWidth;
      primaryJob.classList.add('just-settled');
    }

    const anyActive = [...document.querySelectorAll('.register-list .job-register')].some((row) => nonterminal.has(row.dataset.status));
    liveRegister.hidden = !anyActive || body.dataset.mode !== 'full';
  }

  function openCancelConfirm() {
    cancelConfirm.hidden = false;
  }

  function dismissCancelConfirm() {
    cancelConfirm.hidden = true;
  }

  function confirmCancel() {
    setLifecycle('cancelling', { settle: false });
    cancelTimer = window.setTimeout(() => {
      setLifecycle('cancelled');
      cancelTimer = null;
    }, 760);
  }

  document.addEventListener('click', (event) => {
    const conceptControl = event.target.closest('[data-concept-button]');
    if (conceptControl) {
      setConcept(conceptControl.dataset.conceptButton);
      setMode('full');
      return;
    }

    const modeControl = event.target.closest('[data-mode-button]');
    if (modeControl) {
      setMode(modeControl.dataset.modeButton);
      return;
    }

    if (event.target.closest('[data-cancel-trigger]')) openCancelConfirm();
    if (event.target.closest('[data-cancel-dismiss]')) dismissCancelConfirm();
    if (event.target.closest('[data-cancel-confirm-action]')) confirmCancel();
  });

  if (params.get('clean') === '1') body.classList.add('is-clean');
  setConcept(params.get('concept') || 'register');
  setMode(params.get('mode') || 'full');

  window.activityPrototype = {
    setConcept,
    setMode,
    setLifecycle,
    openCancelConfirm,
    dismissCancelConfirm,
    confirmCancel,
  };
})();
