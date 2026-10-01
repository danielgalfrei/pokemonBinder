// Vista ampliada de una carta con inclinación 3D (ratón o dedo). ESC, ✕ o clic fuera para cerrar.
import { cardImage } from './api.js';

const MAX_TILT = 22; // grados
const overlay = document.getElementById('zoom');
const card = document.getElementById('zoom-card');
const img = card.querySelector('img');
const actions = { change: null, remove: null };

export const isZoomOpen = () => !overlay.hidden;

/** `handlers`: { onChange, onRemove } — acciones sobre la carta mostrada. */
export function openZoom(data, { onChange, onRemove } = {}) {
  img.src = cardImage(data, 'high');
  img.alt = data.name;
  actions.change = onChange;
  actions.remove = onRemove;
  resetTilt();
  overlay.hidden = false;
}

export function closeZoom() {
  overlay.hidden = true;
  img.removeAttribute('src');
}

function resetTilt() {
  card.style.transition = 'transform .4s ease';
  card.style.transform = '';
  card.style.setProperty('--gx', '50%');
  card.style.setProperty('--gy', '50%');
}

function tilt(x, y) {
  const r = card.getBoundingClientRect();
  // Posición relativa al centro de la carta, normalizada a [-1, 1] (acotada).
  const nx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (innerWidth / 2)));
  const ny = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (innerHeight / 2)));
  card.style.transition = 'transform .08s linear';
  card.style.transform = `rotateX(${-ny * MAX_TILT}deg) rotateY(${nx * MAX_TILT}deg) scale(1.03)`;
  card.style.setProperty('--gx', `${50 + nx * 50}%`);
  card.style.setProperty('--gy', `${50 + ny * 50}%`);
}

overlay.addEventListener('mousemove', e => tilt(e.clientX, e.clientY));
overlay.addEventListener('mouseleave', resetTilt);
overlay.addEventListener('touchstart', e => tilt(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
overlay.addEventListener('touchmove', e => tilt(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
overlay.addEventListener('touchend', resetTilt);
overlay.addEventListener('click', e => {
  if (e.target.closest('#zoom-change')) actions.change?.();
  else if (e.target.closest('#zoom-remove')) actions.remove?.();
  else if (e.target.closest('#zoom-close') || !card.contains(e.target)) closeZoom();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isZoomOpen()) closeZoom(); });
