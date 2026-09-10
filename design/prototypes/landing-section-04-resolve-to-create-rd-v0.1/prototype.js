const section = document.querySelector('[data-resolve-section]');
const sticky = document.querySelector('[data-resolve-sticky]');
const stage = document.querySelector('[data-resolve-stage]');
const tiles = [...document.querySelectorAll('[data-tile]')];
const peripherals = [...document.querySelectorAll('[data-peripheral]')];
const progressLabel = document.querySelector('[data-progress-label]');

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const narrowQuery = window.matchMedia('(max-width: 760px)');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (value) => {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
};

function getScrollProgress() {
  if (!section || !sticky) return 1;
  if (reducedMotionQuery.matches || narrowQuery.matches) return 1;

  const rect = section.getBoundingClientRect();
  const total = Math.max(1, section.offsetHeight - sticky.offsetHeight);
  return clamp(-rect.top / total);
}

function render(rawProgress) {
  const progress = ease(rawProgress);
  stage?.setAttribute('data-progress', progress.toFixed(3));
  stage?.setAttribute('data-resolved', progress > 0.92 ? 'true' : 'false');

  if (progressLabel) {
    progressLabel.textContent = `RESOLVE ${String(Math.round(progress * 100)).padStart(3, '0')}`;
  }

  tiles.forEach((tile) => {
    const dx = Number(tile.dataset.dx || 0);
    const dy = Number(tile.dataset.dy || 0);
    const initialScale = Number(tile.dataset.scale || 1);
    const initialRotate = Number(tile.dataset.rotate || 0);

    const translateX = dx * (1 - progress);
    const translateY = dy * (1 - progress);
    const scale = initialScale + (1 - initialScale) * progress;
    const rotate = initialRotate * (1 - progress);
    const depth = (1 - progress) * (Math.abs(dx) + Math.abs(dy)) * 0.025;

    tile.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, ${depth.toFixed(2)}px) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`;
  });

  peripherals.forEach((card, index) => {
    const direction = index === 0 ? 1 : -1;
    const opacity = clamp(1 - progress * 1.35);
    const x = direction * progress * 92;
    const y = progress * (index === 0 ? -46 : 52);
    const rotate = (index === 0 ? 4 : -5) + direction * progress * 5;
    const scale = 1 - progress * 0.16;
    card.style.opacity = opacity.toFixed(3);
    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg)`;
  });
}

let frame = 0;
function scheduleRender() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    render(getScrollProgress());
  });
}

function resetMode() {
  if (reducedMotionQuery.matches || narrowQuery.matches) {
    render(1);
  } else {
    scheduleRender();
  }
}

window.addEventListener('scroll', scheduleRender, { passive: true });
window.addEventListener('resize', resetMode);
reducedMotionQuery.addEventListener?.('change', resetMode);
narrowQuery.addEventListener?.('change', resetMode);

resetMode();
