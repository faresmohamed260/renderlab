(() => {
  const params = new URLSearchParams(window.location.search);
  const body = document.body;
  const content = document.querySelector('[data-activity-content]');
  const loadingView = document.querySelector('[data-loading-view]');
  const emptyView = document.querySelector('[data-empty-view]');
  const modeButtons = [...document.querySelectorAll('[data-mode-button]')];
  const primaryJob = document.querySelector('#primary-job');
  const primaryStatus = document.querySelector('[data-primary-status]');
  const primaryNote = document.querySelector('[data-primary-note]');
  const primaryActions = document.querySelector('[data-primary-actions]');
  const primaryFault = document.querySelector('[data-primary-fault]');
  const cancelConfirm = document.querySelector('[data-cancel-confirm]');
  const registerRows = [...document.querySelectorAll('.register-row')];
  const validModes = new Set(['full', 'loading', 'empty', 'settled']);
  const nonterminal = new Set(['queued', 'preparing', 'running', 'cancelling', 'persisting']);
  const cancellable = new Set(['queued', 'preparing', 'running']);
  let cancelTimer = null;

  const registerDefaults = registerRows.map((row) => ({
    row,
    status: row.dataset.status,
    label: row.querySelector('.register-state strong')?.textContent || '',
    action: row.querySelector('.register-action')?.innerHTML || '',
  }));

  function actionButton(label, attrs = '') {
    return `<button class="button quiet" type="button" ${attrs}>${label}</button>`;
  }

  function setLivePresence() {
    const anyActive = [...document.querySelectorAll('[data-status]')].some((node) => nonterminal.has(node.dataset.status));
    body.dataset.live = anyActive && body.dataset.mode !== 'loading' && body.dataset.mode !== 'empty' ? 'on' : 'off';
  }

  function renderPrimaryActions(status) {
    if (cancellable.has(status)) {
      primaryActions.innerHTML = actionButton('Cancel', 'data-cancel-trigger');
    } else if (status === 'succeeded') {
      primaryActions.innerHTML = '<a class="button primary" href="#">View result</a>' + actionButton('Run again');
    } else if (status === 'failed') {
      primaryActions.innerHTML = actionButton('Retry');
    } else {
      primaryActions.innerHTML = '';
    }
  }

  function setLifecycle(next, { settle = true } = {}) {
    const allowed = new Set(['queued', 'preparing', 'running', 'cancelling', 'persisting', 'succeeded', 'failed', 'cancelled']);
    if (!allowed.has(next)) throw new Error(`Unsupported lifecycle state: ${next}`);
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
    renderPrimaryActions(next);

    primaryJob.classList.remove('just-settled');
    if (settle && !nonterminal.has(next)) {
      void primaryJob.offsetWidth;
      primaryJob.classList.add('just-settled');
    }
    setLivePresence();
  }

  function restoreRegister() {
    registerDefaults.forEach(({ row, status, label, action }) => {
      row.dataset.status = status;
      row.classList.toggle('is-active', nonterminal.has(status));
      row.classList.toggle('is-terminal', !nonterminal.has(status));
      const state = row.querySelector('.register-state strong');
      const actionNode = row.querySelector('.register-action');
      if (state) state.textContent = label;
      if (actionNode) actionNode.innerHTML = action;
    });
  }

  function settleRegister() {
    const terminalStates = ['succeeded', 'cancelled', 'succeeded', 'cancelled', 'cancelled'];
    const terminalLabels = ['Succeeded', 'Cancelled', 'Succeeded', 'Cancelled', 'Cancelled'];
    registerRows.forEach((row, index) => {
      row.dataset.status = terminalStates[index];
      row.classList.remove('is-active');
      row.classList.add('is-terminal');
      const state = row.querySelector('.register-state strong');
      const action = row.querySelector('.register-action');
      if (state) state.textContent = terminalLabels[index];
      if (action) action.innerHTML = '';
    });
  }

  function setMode(next) {
    const mode = validModes.has(next) ? next : 'full';
    body.dataset.mode = mode;
    loadingView.hidden = mode !== 'loading';
    emptyView.hidden = mode !== 'empty';
    content.hidden = mode === 'loading' || mode === 'empty';

    if (mode === 'settled') {
      restoreRegister();
      settleRegister();
      setLifecycle('succeeded', { settle: false });
    } else if (mode === 'full') {
      restoreRegister();
      setLifecycle('running', { settle: false });
    } else {
      body.dataset.live = 'off';
    }

    modeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.modeButton === mode)));
    setLivePresence();
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
    const modeButton = event.target.closest('[data-mode-button]');
    if (modeButton) {
      setMode(modeButton.dataset.modeButton);
      return;
    }
    if (event.target.closest('[data-cancel-trigger]')) openCancelConfirm();
    if (event.target.closest('[data-cancel-dismiss]')) dismissCancelConfirm();
    if (event.target.closest('[data-cancel-confirm-action]')) confirmCancel();
  });

  if (params.get('clean') === '1') body.classList.add('is-clean');
  setMode(params.get('mode') || 'full');

  window.activitySystemPrototype = {
    setMode,
    setLifecycle,
    openCancelConfirm,
    dismissCancelConfirm,
    confirmCancel,
  };
})();