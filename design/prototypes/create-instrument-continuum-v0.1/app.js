(() => {
  const instrument = document.querySelector('.instrument');
  const prompt = document.querySelector('#prompt');
  const contextTitle = document.querySelector('#context-title');
  const contextSupport = document.querySelector('#context-support');
  const operationCaption = document.querySelector('#operation-caption');
  const truthChip = document.querySelector('#truth-chip');
  const sourceDock = document.querySelector('#source-dock');
  const addSource = document.querySelector('#add-source');
  const advancedTrigger = document.querySelector('#advanced-trigger');
  const precisionPanel = document.querySelector('#precision-panel');
  const generate = document.querySelector('#generate');
  const generateLabel = generate.querySelector('.generate-label');
  const lifecycle = document.querySelector('#lifecycle');
  const lifecycleCopy = document.querySelector('#lifecycle-copy');
  const modelControl = document.querySelector('#model-control');
  const ratioControl = document.querySelector('#ratio-control');
  const videoControl = document.querySelector('#video-control');
  const imageAdvanced = [...document.querySelectorAll('.image-advanced')];
  const videoAdvanced = [...document.querySelectorAll('.video-advanced')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let mode = 'image';
  let state = 'image';
  let refs = [];
  let nextAlias = 1;
  let advancedOpen = false;
  let generationTimer = null;
  let draggedAlias = null;

  const sourceFixtures = [
    { label: 'Blue glass study', gradient: 'a' },
    { label: 'Gallery lighting', gradient: 'b' },
  ];

  function tileMarkup(ref, index) {
    const role = refs.length > 1 ? (index === 0 ? 'Primary image' : 'Reference image') : (mode === 'video' ? 'Animating this image' : 'Editing this image');
    return `
      <article class="source-tile" draggable="true" data-alias="${ref.alias}" tabindex="0">
        <div class="source-thumb" data-gradient="${ref.gradient}" aria-hidden="true"></div>
        <div class="source-copy"><strong>${role}</strong><span>@${ref.alias} · ${ref.label}</span></div>
        <div class="source-actions">
          ${index > 0 && mode === 'image' ? `<button type="button" data-make-primary="${ref.alias}" aria-label="Make @${ref.alias} primary">↑</button>` : ''}
          <button type="button" data-remove="${ref.alias}" aria-label="Remove @${ref.alias}">×</button>
        </div>
      </article>`;
  }

  function renderRefs() {
    sourceDock.innerHTML = refs.map(tileMarkup).join('');
    [...sourceDock.querySelectorAll('.source-tile')].forEach((tile) => {
      tile.addEventListener('dragstart', () => {
        draggedAlias = tile.dataset.alias;
        tile.classList.add('dragging');
      });
      tile.addEventListener('dragend', () => {
        draggedAlias = null;
        tile.classList.remove('dragging');
        [...sourceDock.children].forEach((node) => node.classList.remove('drag-target'));
      });
      tile.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (draggedAlias && draggedAlias !== tile.dataset.alias) tile.classList.add('drag-target');
      });
      tile.addEventListener('dragleave', () => tile.classList.remove('drag-target'));
      tile.addEventListener('drop', (event) => {
        event.preventDefault();
        tile.classList.remove('drag-target');
        if (!draggedAlias || draggedAlias === tile.dataset.alias) return;
        moveAliasBefore(draggedAlias, tile.dataset.alias);
      });
    });
    sourceDock.querySelectorAll('[data-make-primary]').forEach((button) => {
      button.addEventListener('click', () => makePrimary(button.dataset.makePrimary));
    });
    sourceDock.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => removeRef(button.dataset.remove));
    });
  }

  function animateRefReorder(beforeRects) {
    if (reduced.matches) return;
    [...sourceDock.querySelectorAll('.source-tile')].forEach((tile) => {
      const before = beforeRects.get(tile.dataset.alias);
      if (!before) return;
      const after = tile.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      tile.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  }

  function snapshotRects() {
    return new Map([...sourceDock.querySelectorAll('.source-tile')].map((tile) => [tile.dataset.alias, tile.getBoundingClientRect()]));
  }

  function moveAliasBefore(alias, targetAlias) {
    const before = snapshotRects();
    const from = refs.findIndex((ref) => ref.alias === alias);
    const target = refs.findIndex((ref) => ref.alias === targetAlias);
    if (from < 0 || target < 0) return;
    const next = [...refs];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    refs = next;
    renderRefs();
    animateRefReorder(before);
    syncCopy();
  }

  function makePrimary(alias) {
    if (mode !== 'image') return;
    const before = snapshotRects();
    const index = refs.findIndex((ref) => ref.alias === alias);
    if (index <= 0) return;
    refs = [refs[index], ...refs.filter((_, i) => i !== index)];
    renderRefs();
    animateRefReorder(before);
    syncCopy();
  }

  function removeRef(alias) {
    const tile = sourceDock.querySelector(`[data-alias="${alias}"]`);
    const complete = () => {
      refs = refs.filter((ref) => ref.alias !== alias);
      renderRefs();
      syncCopy();
    };
    if (!tile || reduced.matches) return complete();
    tile.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.96) translateY(-7px)' },
    ], { duration: 160, easing: 'ease-out' }).finished.then(complete);
  }

  function addRef() {
    const max = mode === 'image' ? 2 : 1;
    if (refs.length >= max) return;
    const fixture = sourceFixtures[refs.length % sourceFixtures.length];
    const ref = { alias: `image${nextAlias++}`, ...fixture };
    refs = [...refs, ref];
    renderRefs();
    const tile = sourceDock.querySelector(`[data-alias="${ref.alias}"]`);
    if (tile && !reduced.matches) {
      tile.animate([
        { opacity: 0, transform: 'translateY(12px) scale(.96)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    syncCopy();
  }

  function setMode(nextMode) {
    if (nextMode === mode) return;
    if (nextMode === 'video' && refs.length > 1) refs = refs.slice(0, 1);
    mode = nextMode;
    instrument.dataset.mode = mode;
    document.querySelectorAll('[data-mode-option]').forEach((button) => {
      button.setAttribute('aria-checked', String(button.dataset.modeOption === mode));
    });
    modelControl.hidden = mode !== 'image';
    videoControl.hidden = mode !== 'video';
    imageAdvanced.forEach((node) => node.hidden = mode !== 'image');
    videoAdvanced.forEach((node) => node.hidden = mode !== 'video');
    if (mode === 'image') ratioControl.firstChild.textContent = refs.length ? 'Original ' : '1:1 ';
    else ratioControl.firstChild.textContent = refs.length ? 'Original ' : '16:9 ';
    renderRefs();
    syncCopy();
  }

  function setAdvanced(open) {
    advancedOpen = open;
    precisionPanel.hidden = !open;
    advancedTrigger.setAttribute('aria-expanded', String(open));
    advancedTrigger.setAttribute('aria-label', open ? 'Close Advanced controls' : 'Open Advanced controls');
  }

  function setState(nextState) {
    clearTimeout(generationTimer);
    state = nextState;
    instrument.dataset.state = state;
    lifecycle.hidden = state !== 'generating';
    if (state === 'generating') {
      truthChip.textContent = 'Running';
      generateLabel.textContent = 'Generating';
      lifecycleCopy.textContent = 'Generating.';
    } else if (state === 'result') {
      truthChip.textContent = 'Saved';
      generateLabel.textContent = 'Generate again';
    } else {
      truthChip.textContent = 'Ready';
      generateLabel.textContent = 'Generate';
    }
  }

  function syncCopy() {
    const hasRef = refs.length > 0;
    if (mode === 'video') {
      contextTitle.textContent = hasRef ? 'Animate an image' : 'Create a video';
      contextSupport.textContent = hasRef ? 'Your source stays attached while motion settings reshape the same instrument.' : 'Prompt, timing, resolution and audio stay in one continuous control rail.';
      operationCaption.textContent = hasRef ? 'Animate image' : 'Create video';
    } else {
      contextTitle.textContent = hasRef ? 'Edit an image' : 'What do you want to create?';
      contextSupport.textContent = refs.length > 1 ? 'Sources remain distinct objects; the first source controls primary edit geometry.' : hasRef ? 'Your source becomes part of the instrument instead of a detached attachment row.' : 'Describe an idea, then shape it with sources and precision controls.';
      operationCaption.textContent = hasRef ? 'Edit image' : 'Create image';
    }
  }

  function startGenerate() {
    setState('generating');
    generationTimer = setTimeout(() => setState('result'), 1450);
  }

  function applyReviewState(name) {
    setAdvanced(false);
    refs = [];
    nextAlias = 1;
    setMode(name === 'video' ? 'video' : 'image');
    if (name === 'references') {
      refs = [
        { alias: 'image1', ...sourceFixtures[0] },
        { alias: 'image2', ...sourceFixtures[1] },
      ];
      nextAlias = 3;
      renderRefs();
      syncCopy();
      setState('image');
    } else if (name === 'advanced') {
      refs = [{ alias: 'image1', ...sourceFixtures[0] }];
      nextAlias = 2;
      renderRefs();
      syncCopy();
      setAdvanced(true);
      setState('image');
    } else if (name === 'generating') {
      refs = [{ alias: 'image1', ...sourceFixtures[0] }];
      nextAlias = 2;
      renderRefs();
      syncCopy();
      setState('generating');
    } else if (name === 'result') {
      refs = [{ alias: 'image1', ...sourceFixtures[0] }];
      nextAlias = 2;
      renderRefs();
      syncCopy();
      setState('result');
    } else {
      renderRefs();
      syncCopy();
      setState(name === 'video' ? 'video' : 'image');
    }
  }

  document.querySelectorAll('[data-mode-option]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.modeOption)));
  document.querySelectorAll('[data-review-state]').forEach((button) => button.addEventListener('click', () => applyReviewState(button.dataset.reviewState)));
  addSource.addEventListener('click', addRef);
  advancedTrigger.addEventListener('click', () => setAdvanced(!advancedOpen));
  generate.addEventListener('click', startGenerate);
  document.querySelector('#reset-advanced').addEventListener('click', () => {});

  const initial = new URLSearchParams(location.search).get('state') || 'image';
  applyReviewState(['image','video','references','advanced','generating','result'].includes(initial) ? initial : 'image');
  prompt.addEventListener('input', () => {});
})();
