// Cliente mínimo de la API REST de TCGdex (https://api.tcgdex.net/v2/es)
const BASE = 'https://api.tcgdex.net/v2/es';

export const normalize = s =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`TCGdex ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Todas las cartas con imagen (campo `search` precalculado), más las expansiones y los valores de los filtros. */
export async function loadCatalog() {
  const [cards, sets, types, rarities, categories, stages] = await Promise.all([
    get('/cards'), get('/sets'), get('/types'), get('/rarities'), get('/categories'), get('/stages'),
  ]);
  const setNames = new Map(sets.map(s => [s.id, s.name]));
  return {
    cards: cards.filter(c => c.image).map(c => {
      const setId = c.id.slice(0, c.id.lastIndexOf('-'));
      const setName = setNames.get(setId) ?? setId;
      return {
        id: c.id,
        setId,
        name: c.name,
        number: c.localId,
        setName,
        image: c.image,
        search: normalize(c.name),
      };
    }),
    sets: sets.map(s => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    options: { types, rarity: rarities, category: categories, stage: stages },
  };
}

const idCache = new Map();

/**
 * Los datos de tipo/rareza/categoría/fase no vienen en el listado de cartas, pero la API
 * filtra en servidor (`?types=eq:Fuego`). Devuelve el conjunto de ids que cumplen todos los filtros.
 */
export async function fetchMatchingIds(filters) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) qs.set(key, `eq:${value}`);
  const key = qs.toString();
  if (!idCache.has(key)) idCache.set(key, get(`/cards?${key}`).then(list => new Set(list.map(c => c.id))));
  return idCache.get(key);
}

export const cardImage = (card, quality = 'low') => `${card.image}/${quality}.webp`;
