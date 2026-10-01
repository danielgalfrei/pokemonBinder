import { loadCatalog, cardImage } from './api.js';
import { loadAlbum, saveAlbum, emptyPage } from './store.js';
import { createPicker } from './picker.js';
import { openZoom, closeZoom, isZoomOpen } from './zoom.js';

const album = loadAlbum();
const $ = id => document.getElementById(id);
const bookEl = $('book'), status = $('status');
let picker = null;

// Escritorio: vistas como en un libro real. 0 = portada cerrada; 1 = [guarda en blanco | página 1];
// 2 = [página 2 | página 3]; etc. Un lado sin página (guarda inicial o final) se muestra en blanco.
// Móvil: una página por vez. mPos: 0 = portada, n = página n.
const mobileQuery = matchMedia('(max-width: 700px)');
const isMobile = () => mobileQuery.matches;
const lastView = () => Math.floor(album.pages.length / 2) + 1;
const viewOfPage = i => Math.floor((i + 1) / 2) + 1;
const spreadPages = view => [2 * view - 3, 2 * view - 2].map(i => (i >= 0 && i < album.pages.length ? i : null));
const mobilePosOfView = view => (view === 0 ? 0 : Math.max(1, 2 * view - 2));
let mPos = mobilePosOfView(album.view);

// Cada modo describe cómo se lee/escribe la posición y qué se muestra; render y go no ramifican por modo.
const modes = {
  mobile: {
    get: () => mPos,
    set: v => { mPos = v; album.view = v === 0 ? 0 : viewOfPage(v - 1); },
    last: () => album.pages.length,
    content: direction => singlePage(mPos - 1, direction),
    label: () => `Página ${mPos} de ${album.pages.length}`,
  },
  desktop: {
    get: () => album.view,
    set: v => { album.view = v; },
    last: lastView,
    content: spread,
    label: () => {
      const pages = spreadPages(album.view).filter(i => i !== null).map(i => i + 1);
      return `Página${pages.length > 1 ? 's' : ''} ${pages.join('–')} de ${album.pages.length}`;
    },
  },
};
const mode = () => (isMobile() ? modes.mobile : modes.desktop);

function render(direction = 0) {
  const m = mode();
  m.set(Math.max(0, Math.min(m.get(), m.last())));
  const isCover = m.get() === 0;
  bookEl.replaceChildren(isCover ? cover() : m.content(direction));
  bookEl.className = `book ${isCover ? 'closed' : 'open'}`;
  const total = album.pages.length;
  $('indicator').textContent = isCover ? `Portada · ${total} página${total > 1 ? 's' : ''}` : m.label();
  $('prev').disabled = isCover;
  $('next').disabled = m.get() === m.last();
  saveAlbum(album);
}

function cover() {
  const el = document.createElement('div');
  el.className = 'cover';
  el.tabIndex = 0;
  el.innerHTML = '<h2>pokemon<span>Binder</span></h2><div class="cover-ball"></div><p>Toca para abrir el álbum</p>';
  el.addEventListener('click', () => go(1));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') go(1); });
  return el;
}

function spread(direction) {
  const el = document.createElement('div');
  el.className = 'spread';
  spreadPages(album.view).forEach((pageIdx, side) => {
    const page = pageIdx === null ? blankPage() : pageEl(pageIdx);
    page.classList.add(side === 0 ? 'left' : 'right');
    if (direction > 0 && side === 1) page.classList.add('flip-from-spine');
    if (direction < 0 && side === 0) page.classList.add('flip-from-spine');
    el.append(page);
  });
  return el;
}

function singlePage(pageIdx, direction) {
  const el = pageEl(pageIdx);
  el.classList.add('single');
  if (direction > 0) el.classList.add('flip-from-spine', 'right');
  if (direction < 0) el.classList.add('flip-from-spine', 'left');
  return el;
}

function blankPage() {
  const el = document.createElement('div');
  el.className = 'page blank';
  return el;
}

function pageEl(pageIdx) {
  const el = document.createElement('div');
  el.className = 'page';
  el.innerHTML = '<div class="page-head"><span></span><button class="del" title="Eliminar página" aria-label="Eliminar página">×</button></div><div class="grid"></div>';
  el.querySelector('span').textContent = `Página ${pageIdx + 1}`;
  const del = el.querySelector('.del');
  del.disabled = album.pages.length === 1;
  del.addEventListener('click', () => deletePage(pageIdx));
  const grid = el.querySelector('.grid');
  album.pages[pageIdx].forEach((card, i) => grid.append(slot(card, pageIdx, i)));
  return el;
}

function slot(card, pageIdx, index) {
  const el = document.createElement('div');
  el.className = 'slot' + (card ? ' filled' : '');
  (card ? fillSlot : emptySlot)(el, card, pageIdx, index);
  return el;
}

function fillSlot(el, card, pageIdx, index) {
  el.innerHTML = '<img alt=""><div class="slot-actions"><button data-a="change">Cambiar</button><button data-a="remove" class="danger">Quitar</button></div>';
  const img = el.querySelector('img');
  img.src = cardImage(card, 'high');
  img.alt = card.name;
  img.title = `${card.name} · ${card.setName}`;
  const change = () => choose(el, pageIdx, index);
  const remove = () => setCard(pageIdx, index, null);
  const zoom = () => openZoom(card, {
    onChange: () => { closeZoom(); change(); },
    onRemove: () => { closeZoom(); remove(); },
  });
  const actions = { change, remove };
  el.addEventListener('click', e => (actions[e.target.dataset.a] ?? zoom)());
}

function emptySlot(el, card, pageIdx, index) {
  el.innerHTML = '<span>+ Elegir carta</span>';
  el.tabIndex = 0;
  el.addEventListener('click', () => choose(el, pageIdx, index));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') choose(el, pageIdx, index); });
}

function choose(el, pageIdx, index) {
  if (picker) picker.open(el, card => setCard(pageIdx, index, card));
}

function setCard(pageIdx, index, card) {
  album.pages[pageIdx][index] = card && {
    id: card.id, name: card.name, number: card.number, setName: card.setName, image: card.image,
  };
  render();
}

function go(delta) {
  picker?.close();
  const m = mode();
  const next = m.get() + delta;
  if (next < 0 || next > m.last()) return;
  m.set(next);
  render(delta);
}

function deletePage(pageIdx) {
  if (album.pages.length === 1) return;
  if (album.pages[pageIdx].some(Boolean) && !confirm(`La página ${pageIdx + 1} tiene cartas. ¿Eliminarla?`)) return;
  album.pages.splice(pageIdx, 1);
  render();
}

$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('add-page').onclick = () => {
  album.pages.push(emptyPage());
  album.view = viewOfPage(album.pages.length - 1);
  mPos = album.pages.length;
  picker?.close();
  render(1);
};
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || isZoomOpen()) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
});

// Gesto de deslizar para pasar de página (solo horizontal y claro, para no estorbar al scroll).
let touch = null;
bookEl.addEventListener('touchstart', e => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
bookEl.addEventListener('touchend', e => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
});

// Al cambiar entre móvil y escritorio (girar el teléfono, redimensionar), conserva la posición.
mobileQuery.addEventListener('change', () => {
  picker?.close();
  mPos = mobilePosOfView(album.view);
  render();
});

render();

try {
  const catalog = await loadCatalog();
  picker = createPicker(catalog);
  status.textContent = `${catalog.cards.length.toLocaleString('es')} cartas disponibles`;
} catch (err) {
  console.error(err);
  status.textContent = 'No se pudieron cargar las cartas (¿sin conexión?). Recarga la página.';
  status.classList.add('error');
}
