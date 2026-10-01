// Desplegable con búsqueda y filtros sobre todas las cartas. Una sola instancia compartida por los huecos.
import { normalize, cardImage, fetchMatchingIds } from './api.js';

const BATCH = 40;
const mobileQuery = matchMedia('(max-width: 700px)');

// Filtros resueltos en servidor por TCGdex (clave = parámetro de la API).
const SERVER_FILTERS = [
  ['types', 'Tipo', 'types'],
  ['rarity', 'Rareza', 'rarity'],
  ['category', 'Categoría', 'category'],
  ['stage', 'Fase', 'stage'],
];

export function createPicker({ cards, sets, options }) {
  const root = document.getElementById('picker');
  const input = document.getElementById('picker-input');
  const filtersEl = document.getElementById('picker-filters');
  const list = document.getElementById('picker-list');
  const count = document.getElementById('picker-count');

  const filters = { set: '', types: '', rarity: '', category: '', stage: '' };
  let matches = [];
  let shown = 0;
  let onPick = null;
  let timer;
  let run = 0;

  function addSelect(key, label, values) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    select.append(new Option(`${label}: todos`, ''));
    for (const [value, text] of values) select.append(new Option(text, value));
    select.addEventListener('change', () => { filters[key] = select.value; search(); });
    filtersEl.append(select);
    return select;
  }

  const selects = [
    addSelect('set', 'Expansión', sets.map(s => [s.id, s.name])),
    ...SERVER_FILTERS.map(([key, label, opt]) => addSelect(key, label, options[opt].map(v => [v, v]))),
  ];
  const clear = document.createElement('button');
  clear.textContent = 'Limpiar filtros';
  clear.className = 'link';
  clear.addEventListener('click', () => {
    for (const k in filters) filters[k] = '';
    selects.forEach(s => { s.value = ''; });
    input.value = '';
    search();
    input.focus();
  });
  filtersEl.append(clear);

  function renderMore() {
    const frag = document.createDocumentFragment();
    for (const card of matches.slice(shown, shown + BATCH)) {
      const li = document.createElement('li');
      li.role = 'option';
      li.innerHTML = '<img loading="lazy" alt=""><div><strong></strong><small></small></div>';
      li.querySelector('img').src = cardImage(card, 'low');
      li.querySelector('strong').textContent = card.name;
      li.querySelector('small').textContent = `${card.setName} · ${card.number}`;
      li.addEventListener('click', () => { const cb = onPick; close(); cb?.(card); });
      frag.append(li);
    }
    shown += BATCH;
    list.append(frag);
  }

  async function search() {
    const me = ++run;
    const tokens = normalize(input.value).split(/\s+/).filter(Boolean);
    let result = cards;
    if (filters.set) result = result.filter(c => c.setId === filters.set);
    if (tokens.length) result = result.filter(c => tokens.every(t => c.search.includes(t)));

    const server = Object.fromEntries(SERVER_FILTERS.map(([key]) => [key, filters[key]]));
    if (Object.values(server).some(Boolean)) {
      count.textContent = 'Filtrando…';
      try {
        const ids = await fetchMatchingIds(server);
        if (me !== run) return; // llegó una búsqueda más nueva
        result = result.filter(c => ids.has(c.id));
      } catch {
        if (me === run) count.textContent = 'Error al filtrar. Inténtalo de nuevo.';
        return;
      }
    }

    matches = result;
    count.textContent = `${matches.length.toLocaleString('es')} cartas`;
    list.replaceChildren();
    list.scrollTop = 0;
    shown = 0;
    renderMore();
  }

  function open(anchor, callback) {
    onPick = callback;
    root.hidden = false;
    if (mobileQuery.matches) {
      root.style.left = root.style.top = ''; // en móvil es una hoja anclada abajo (ver CSS)
    } else {
      const r = anchor.getBoundingClientRect();
      const w = root.offsetWidth, h = root.offsetHeight;
      root.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))}px`;
      const below = r.bottom + 6;
      root.style.top = `${below + h < innerHeight ? below : Math.max(8, r.top - h - 6)}px`;
    }
    search();
    input.focus();
    input.select();
  }

  function close() { root.hidden = true; onPick = null; }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 80); });
  list.addEventListener('scroll', () => {
    if (shown < matches.length && list.scrollTop + list.clientHeight > list.scrollHeight - 80) renderMore();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });
  document.addEventListener('mousedown', e => {
    if (!root.hidden && !root.contains(e.target) && !e.target.closest('.slot')) close();
  });

  return { open, close };
}
