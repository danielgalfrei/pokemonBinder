// Estado del álbum persistido en localStorage.
//  - pages: array de páginas; cada una es un array de 9 huecos (carta o null).
//  - view: 0 = portada, n >= 1 = n-ésima vista abierta (ver spreadPages en main.js).
const KEY = 'pokemonBinder:v1';
const SLOTS = 9;
const emptyPage = () => Array(SLOTS).fill(null);

export function loadAlbum() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data?.pages?.length) return { pages: data.pages, view: Number.isInteger(data.view) ? data.view : 0 };
  } catch { /* estado corrupto o storage no disponible */ }
  return { pages: [emptyPage()], view: 0 };
}

export function saveAlbum(album) {
  try { localStorage.setItem(KEY, JSON.stringify(album)); } catch { /* ignorar */ }
}

export { SLOTS, emptyPage };
