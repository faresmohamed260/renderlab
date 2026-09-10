const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion) {
  const matrix = document.querySelector('[data-pointer-stage="matrix"]');
  matrix?.addEventListener('pointermove', (event) => {
    const rect = matrix.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    matrix.style.setProperty('--px', x.toFixed(3));
    matrix.style.setProperty('--py', y.toFixed(3));
  });
  matrix?.addEventListener('pointerleave', () => {
    matrix.style.setProperty('--px', '0');
    matrix.style.setProperty('--py', '0');
  });
}
