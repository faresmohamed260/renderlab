const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const stage = document.querySelector('[data-pointer-stage="matrix"]');

if (!reduceMotion && finePointer && stage) {
  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    stage.style.setProperty('--px', x.toFixed(3));
    stage.style.setProperty('--py', y.toFixed(3));
  });

  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--px', '0');
    stage.style.setProperty('--py', '0');
  });
}
