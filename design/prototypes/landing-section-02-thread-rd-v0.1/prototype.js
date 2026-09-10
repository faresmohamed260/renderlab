const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const section = document.querySelector('[data-thread-section]');
const stage = document.querySelector('[data-thread-stage]');
const labels = [...document.querySelectorAll('[data-step-label]')];
const caption = document.querySelector('[data-stage-caption]');

const captions = ['CREATE IMAGE', 'SHAPE WITH REFERENCES', 'SET IN MOTION', 'KEEP AND CONTINUE'];

function setStep(step) {
  if (!stage) return;
  const clamped = Math.max(0, Math.min(3, step));
  stage.dataset.activeStep = String(clamped);
  labels.forEach((label, index) => label.classList.toggle('is-active', index === clamped));
  if (caption) caption.textContent = captions[clamped];
}

function updateFromScroll() {
  if (reduceMotion || !section) return;
  const rect = section.getBoundingClientRect();
  const total = Math.max(1, section.offsetHeight - window.innerHeight);
  const progressed = Math.max(0, Math.min(total, -rect.top));
  const progress = progressed / total;
  const step = Math.min(3, Math.floor(progress * 4.02));
  setStep(step);
}

setStep(0);

if (!reduceMotion) {
  updateFromScroll();
  window.addEventListener('scroll', updateFromScroll, { passive: true });
  window.addEventListener('resize', updateFromScroll);

  stage?.addEventListener('pointermove', (event) => {
    if (window.innerWidth <= 900) return;
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    stage.style.setProperty('--tilt-x', `${(x * 1.15).toFixed(2)}deg`);
    stage.style.setProperty('--tilt-y', `${(y * -0.8).toFixed(2)}deg`);
  });

  stage?.addEventListener('pointerleave', () => {
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
  });
}
