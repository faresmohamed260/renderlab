const reviewStyles = document.createElement('link');
reviewStyles.rel = 'stylesheet';
reviewStyles.href = 'review-mobile.css';
document.head.append(reviewStyles);

const params = new URLSearchParams(window.location.search);
const variant = ['a', 'b', 'c'].includes(params.get('variant')) ? params.get('variant') : 'a';
document.body.dataset.variant = variant;

for (const link of document.querySelectorAll('[data-variant-link]')) {
  const active = link.dataset.variantLink === variant;
  if (active) link.setAttribute('aria-current', 'page');
}

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

  const aperture = document.querySelector('[data-pointer-stage="aperture"]');
  window.addEventListener('pointermove', (event) => {
    if (!aperture || document.body.dataset.variant !== 'b') return;
    const rect = aperture.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) return;
    const x = Math.max(14, Math.min(86, ((event.clientX - rect.left) / rect.width) * 100));
    aperture.style.setProperty('--split', `${x.toFixed(2)}%`);
  });

  const instrument = document.querySelector('[data-pointer-stage="instrument"]');
  instrument?.addEventListener('pointermove', (event) => {
    const rect = instrument.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    instrument.style.setProperty('--ix', x.toFixed(3));
    instrument.style.setProperty('--iy', y.toFixed(3));
  });
  instrument?.addEventListener('pointerleave', () => {
    instrument.style.setProperty('--ix', '0');
    instrument.style.setProperty('--iy', '0');
  });
}
