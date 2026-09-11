(() => {
  const workspace = document.querySelector('#workspace');
  const composer = document.querySelector('#composer');
  const modeSwitch = document.querySelector('.mode-switch');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  const title = document.querySelector('#create-title');
  const support = document.querySelector('#create-support');
  const eyebrow = document.querySelector('#mode-eyebrow');
  const prompt = document.querySelector('#prompt');
  const refAdd = document.querySelector('#reference-add');
  const refAddLabel = document.querySelector('#reference-add-label');
  const refHelp = document.querySelector('#reference-help');
  const refEmpty = document.querySelector('#reference-empty');
  const refList = document.querySelector('#reference-list');
  const advancedTrigger = document.querySelector('#advanced-trigger');
  const advancedPanel = document.querySelector('#advanced-panel');
  const generateButton = document.querySelector('#generate-button');
  const resultStage = document.querySelector('#result-stage');
  const resultFrame = document.querySelector('#result-frame');
  const resultImage = document.querySelector('#result-image');
  const resultKindLabel = document.querySelector('.result-meta-block .eyebrow');
  const resultTitle = document.querySelector('.result-meta-block h2');
  const resultSummary = document.querySelector('.result-meta-block > p:last-child');
  const resultSpecValues = [...document.querySelectorAll('.result-specs dd')];
  const [resultModel, resultRatio, resultSource] = resultSpecValues;
  const resultActionButtons = [...document.querySelectorAll('[data-result-action]')];
  const notice = document.querySelector('#notice');
  const ratioChip = document.querySelector('[data-setting="ratio"] strong');
  const modelChip = document.querySelector('[data-setting="model"] strong');
  const videoChip = document.querySelector('#video-settings-chip strong');

  const samples = [
    {
      alias: 'image1',
      label: 'Glass reference',
      url: 'https://images.unsplash.com/photo-1771029580794-255d3e82680e?auto=format&fit=crop&w=500&q=80',
    },
    {
      alias: 'image2',
      label: 'Atmosphere reference',
      url: 'https://images.unsplash.com/photo-1760710461795-d6199296eb50?auto=format&fit=crop&w=500&q=80',
    },
  ];

  const generatedReference = {
    alias: 'image1',
    label: 'First light study',
    url: 'https://images.unsplash.com/photo-1773176563345-5e8685906a21?auto=format&fit=crop&w=500&q=80',
    generated: true,
  };

  const state = {
    mode: 'image',
    resultKind: 'image',
    references: [],
    advanced: false,
    phase: 'idle',
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setNotice(message = '', tone = '') {
    notice.textContent = message;
    notice.className = `notice${tone ? ` ${tone}` : ''}`;
  }

  function setMode(nextMode, { force = false } = {}) {
    if (nextMode === 'video' && state.references.length > 1 && !force) {
      setNotice('Video uses one Start image. Remove one reference before switching.', 'error');
      return false;
    }

    state.mode = nextMode;
    composer.classList.toggle('video', nextMode === 'video');
    modeSwitch.classList.toggle('video', nextMode === 'video');
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === nextMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (nextMode === 'image') {
      eyebrow.textContent = 'CREATE / IMAGE';
      title.textContent = 'Create an image';
      support.textContent = 'Describe what you want. Add references if you have them, then generate.';
      prompt.placeholder = state.references.length ? 'Describe the change or result you want…' : 'Describe what you want to create…';
      refAddLabel.textContent = 'Add reference';
      refHelp.textContent = 'Optional · up to two images';
      ratioChip.textContent = state.references.length ? 'Original' : '1:1';
      modelChip.textContent = 'FLUX';
    } else {
      eyebrow.textContent = 'CREATE / VIDEO';
      title.textContent = 'Create a video';
      support.textContent = 'Describe the shot or motion. Add a Start image if you want to animate a specific frame.';
      prompt.placeholder = state.references.length ? 'Describe how the shot should move…' : 'Describe the video you want to create…';
      refAddLabel.textContent = state.references.length ? 'Replace Start image' : 'Add Start image';
      refHelp.textContent = 'Optional · one Start image';
      ratioChip.textContent = state.references.length ? 'Original' : '16:9';
      modelChip.textContent = 'Video';
      videoChip.textContent = '720p · 5s';
    }

    renderReferences();
    setNotice('');
    return true;
  }

  function normalizeAliases() {
    state.references = state.references.map((reference, index) => ({ ...reference, alias: `image${index + 1}` }));
  }

  function makePrimary(index) {
    if (index <= 0 || index >= state.references.length) return;
    const next = [...state.references];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    state.references = next;
    normalizeAliases();
    renderReferences();
    setNotice('Primary image updated.', 'success');
  }

  function removeReference(index) {
    state.references.splice(index, 1);
    normalizeAliases();
    renderReferences();
    if (state.mode === 'image') ratioChip.textContent = state.references.length ? 'Original' : '1:1';
    if (state.mode === 'video') ratioChip.textContent = state.references.length ? 'Original' : '16:9';
    setNotice(state.references.length ? 'Reference removed.' : 'Reference removed. Prompt and settings are unchanged.');
  }

  function renderReferences() {
    refList.innerHTML = '';
    const max = state.mode === 'image' ? 2 : 1;
    refEmpty.style.display = state.references.length < max ? 'flex' : 'none';

    state.references.forEach((reference, index) => {
      const chip = document.createElement('article');
      chip.className = `reference-chip${index === 0 ? ' primary' : ''}`;
      chip.dataset.referenceAlias = reference.alias;
      chip.dataset.referenceIndex = String(index);
      chip.innerHTML = `
        <div class="reference-thumb"><img src="${reference.url}" alt="${reference.label}" /></div>
        <div class="reference-copy">
          <strong>${state.mode === 'video' ? 'Start image' : index === 0 ? 'Primary image' : 'Reference image'}</strong>
          <span>@${reference.alias} · ${reference.label}</span>
        </div>
        <div class="reference-controls">
          ${state.mode === 'image' && index > 0 ? '<button type="button" class="reference-control" data-ref-action="primary">Primary</button>' : ''}
          <button type="button" class="reference-control" data-ref-action="remove" aria-label="Remove reference">Remove</button>
        </div>`;

      chip.querySelector('[data-ref-action="primary"]')?.addEventListener('click', () => makePrimary(index));
      chip.querySelector('[data-ref-action="remove"]')?.addEventListener('click', () => removeReference(index));
      refList.appendChild(chip);
    });

    refList.dataset.order = state.references.map((reference) => reference.alias).join(',');
  }

  function addReference() {
    const max = state.mode === 'image' ? 2 : 1;
    if (state.references.length >= max) {
      setNotice(state.mode === 'image' ? 'Image supports up to two references.' : 'Video uses one Start image.', 'error');
      return;
    }

    const sample = samples[state.references.length] ?? samples[0];
    state.references.push({ ...sample, alias: `image${state.references.length + 1}` });
    renderReferences();
    ratioChip.textContent = 'Original';
    prompt.placeholder = state.mode === 'video' ? 'Describe how the shot should move…' : 'Describe the change or result you want…';
    setNotice(state.mode === 'video' ? 'Start image attached.' : 'Reference attached.', 'success');
  }

  function setAdvanced(open) {
    state.advanced = open;
    advancedPanel.hidden = !open;
    advancedTrigger.setAttribute('aria-expanded', String(open));
    advancedTrigger.querySelector('strong').textContent = open ? '−' : '＋';
  }

  function setResultPresentation(kind) {
    state.resultKind = kind;
    resultStage.dataset.kind = kind;
    resultFrame.dataset.kind = kind;
    const isImage = kind === 'image';

    resultKindLabel.textContent = isImage ? 'RESULT / IMAGE' : 'RESULT / VIDEO';
    resultTitle.textContent = isImage ? 'First light study' : 'Morning mist motion';
    resultSummary.textContent = isImage
      ? 'Generated from this composer. Keep going without rebuilding the request.'
      : 'Generated video saved to your Library. Adjust the same request below or open it from Library.';
    resultModel.textContent = isImage ? 'FLUX' : 'REDGraft LTX';
    resultRatio.textContent = ratioChip.textContent;
    resultImage.alt = isImage ? 'Generated image result' : 'Generated video poster frame';

    resultActionButtons.forEach((button) => {
      button.hidden = !isImage;
    });
  }

  function resetResult() {
    state.phase = 'idle';
    resultStage.dataset.phase = 'idle';
    workspace.classList.remove('has-result', 'generating');
    generateButton.disabled = false;
    generateButton.textContent = 'Generate';
  }

  function showResult() {
    state.phase = 'result';
    setResultPresentation(state.resultKind);
    resultStage.dataset.phase = 'result';
    workspace.classList.remove('generating');
    workspace.classList.add('has-result');
    generateButton.disabled = false;
    generateButton.textContent = 'Generate';
    resultSource.textContent = state.references.length ? `${state.references.length} reference${state.references.length > 1 ? 's' : ''}` : 'Prompt only';
    setNotice(
      state.resultKind === 'image'
        ? 'Image ready. Continue from it or adjust the same request below.'
        : 'Video ready. It is saved to Library; adjust the same request below if you want another pass.',
      'success',
    );
  }

  function generate() {
    if (!prompt.value.trim()) {
      setNotice('Write a prompt before generating.', 'error');
      prompt.focus();
      return;
    }

    state.phase = 'generating';
    state.resultKind = state.mode;
    setResultPresentation(state.resultKind);
    resultStage.dataset.phase = 'generating';
    workspace.classList.add('has-result', 'generating');
    generateButton.disabled = true;
    generateButton.textContent = 'Generating…';
    setNotice('Generating. Your request stays editable below.');

    window.setTimeout(showResult, reducedMotion ? 40 : 1350);
  }

  function continueFromResult(action) {
    if (state.resultKind !== 'image') return;

    if (action === 'animate') {
      state.references = [{ ...generatedReference }];
      normalizeAliases();
      setMode('video', { force: true });
      resetResult();
      prompt.value = '';
      prompt.placeholder = 'Describe how the shot should move…';
      setNotice('Result added as Start image. Describe the motion, then Generate.', 'success');
      prompt.focus();
      return;
    }

    if (action === 'edit') {
      state.references = [{ ...generatedReference }];
      normalizeAliases();
      setMode('image', { force: true });
      resetResult();
      prompt.value = '';
      prompt.placeholder = 'Describe the change you want…';
      setNotice('Result loaded as the Primary image.', 'success');
      prompt.focus();
      return;
    }

    if (action === 'reference') {
      const current = state.references.filter((reference) => !reference.generated);
      state.references = current.slice(0, 1);
      state.references.push({ ...generatedReference, alias: `image${state.references.length + 1}` });
      normalizeAliases();
      setMode('image', { force: true });
      resetResult();
      setNotice('Result attached as a reference.', 'success');
      prompt.focus();
      return;
    }

    if (action === 'upscale') setNotice('Upscale 2× would continue through the existing media workflow.', 'success');
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  refAdd.addEventListener('click', addReference);
  advancedTrigger.addEventListener('click', () => setAdvanced(!state.advanced));
  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });
  resultActionButtons.forEach((button) => {
    button.addEventListener('click', () => continueFromResult(button.dataset.resultAction));
  });

  resultFrame.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reducedMotion || state.phase !== 'result') return;
    const rect = resultFrame.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    resultFrame.style.transform = `perspective(1000px) rotateX(${y * -1.2}deg) rotateY(${x * 1.5}deg) translateZ(0)`;
  });
  resultFrame.addEventListener('pointerleave', () => {
    resultFrame.style.transform = '';
  });

  setMode('image', { force: true });
  setResultPresentation('image');
  renderReferences();
})();