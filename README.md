# pokemonBinder

Álbum virtual de cartas Pokémon. Se comporta como un libro real: tiene portada, páginas que se pasan y cada página es una cuadrícula 3x3 en la que colocas la carta que quieras en cada hueco. El catálogo de cartas (en español) viene de la API pública de [TCGdex](https://tcgdex.dev/es).

## Características

- **Portada y modo libro.** El álbum se abre desde la portada. Se ve como un libro de dos páginas: guarda en blanco | página 1, luego página 2 | página 3, y así. Si la última página queda sola, la hoja de al lado se muestra en blanco.
- **Cuadrícula 3x3 por página.** Puedes añadir páginas al final y eliminar cualquiera (pide confirmación si tiene cartas).
- **Selector de cartas con búsqueda.** Cada hueco abre un desplegable con las ~14.000 cartas con imagen del catálogo. El campo de texto busca por nombre (sin distinguir mayúsculas ni acentos).
- **Filtros:** expansión, tipo, rareza, categoría (Pokémon, Entrenador, Energía) y fase (Básico, Fase 1, VMAX…). Se combinan entre sí y con el texto.
- **Carta ampliada en 3D.** Al pulsar una carta del álbum se muestra grande en primer plano y se inclina siguiendo el ratón (o el dedo) con un brillo. `Esc`, la ✕ o un clic fuera vuelven al álbum. Desde ahí también puedes cambiarla o quitarla.
- **Responsive.** En móvil (hasta 700 px) se muestra una página a la vez, se pasa deslizando el dedo y el selector se abre como una hoja inferior.
- **Persistencia.** El álbum se guarda automáticamente en el navegador (`localStorage`); al recargar queda todo como lo dejaste.

### Controles

| Acción | Escritorio | Móvil |
|---|---|---|
| Abrir el álbum | Clic en la portada / `Enter` | Toca la portada |
| Pasar de página | Flechas de pantalla o `←` `→` | Flechas o deslizar |
| Elegir carta | Clic en un hueco vacío | Toca un hueco vacío |
| Ver carta ampliada | Clic en una carta | Toca una carta |
| Cambiar / quitar carta | Botones al pasar el ratón, o en la vista ampliada | Botones en la vista ampliada |
| Cerrar vista ampliada o selector | `Esc` o clic fuera | ✕ o toca fuera |

## Puesta en marcha

Requisito: **Python 3** (solo se usa para servir ficheros estáticos) y conexión a internet (las cartas y sus imágenes se descargan de TCGdex).

```bash
./start.sh          # http://localhost:5173
./start.sh 8080     # otro puerto
```

El script elige `python3`, `python` o `py -3`, abre el navegador y sirve la carpeta `src/` en `127.0.0.1`. Para parar, `Ctrl+C`. En Windows, ejecútalo desde Git Bash. Si prefieres no usar el script:

```bash
cd src && python -m http.server 5173
```

Hace falta servirlo por HTTP (no vale abrir `index.html` con doble clic) porque usa módulos ES.

## Arquitectura

HTML, CSS y JavaScript (módulos ES) sin build ni dependencias, así que no hace falta Node ni `npm`.

```
pokemonBinder/
├── start.sh              # lanza el servidor local
└── src/
    ├── index.html        # estructura: libro, controles, selector y vista ampliada
    ├── css/styles.css    # estilos del libro, portada, selector y zoom (+ media query móvil)
    └── js/
        ├── main.js       # render del álbum, navegación, páginas y huecos
        ├── store.js      # estado del álbum y persistencia en localStorage
        ├── api.js        # cliente de TCGdex
        ├── picker.js     # selector de cartas: búsqueda y filtros
        └── zoom.js       # carta ampliada con inclinación 3D
```

### Modelo de datos

El álbum es un objeto `{ pages, view }`:

- `pages`: array de páginas; cada página es un array de 9 huecos con `null` o una carta (`id`, `name`, `number`, `setName`, `image`).
- `view`: `0` es la portada; `n ≥ 1` es la n-ésima vista abierta del libro. En móvil la posición se deriva de `view`, así que al girar el teléfono o redimensionar se conserva dónde estabas.

Se guarda en `localStorage` bajo la clave `pokemonBinder:v1`. Solo se guarda lo necesario para pintar la carta, no el catálogo completo.

### Uso de la API de TCGdex

Base: `https://api.tcgdex.net/v2/es`.

- **Al cargar**, `/cards` (listado resumido: id, nombre, imagen), `/sets` y los valores de los filtros (`/types`, `/rarities`, `/categories`, `/stages`). Se descartan las cartas sin imagen y se precalcula el texto de búsqueda.
- **Expansión y nombre** se filtran en el cliente: el id de la carta incluye el de su set y el nombre ya viene en el listado.
- **Tipo, rareza, categoría y fase** no vienen en el listado. Se filtran en el servidor con consultas como `/cards?types=eq:Fuego&stage=eq:Básico`, que devuelven los ids que cumplen todo. Se cruzan con el catálogo local y se cachean por combinación.
- **Imágenes:** `{image}/low.webp` en el selector y `{image}/high.webp` en el álbum y la vista ampliada.

## Limitaciones conocidas

- Sin conexión no se pueden elegir cartas nuevas (las ya guardadas tampoco cargarán su imagen).
- El álbum vive en el navegador: no se sincroniza entre dispositivos ni se puede exportar todavía.
- Hay un solo álbum.

## Ideas para siguientes pasos

- Exportar/importar el álbum (JSON) y más de un álbum.
- Reordenar o mover cartas entre huecos y páginas.
- Más filtros (puntos de vida, ilustrador, año) y ordenación.
- Modo offline con caché del catálogo.
