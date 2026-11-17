# WFHelper Fell Mod

Fork personal de [WFHelper](https://github.com/WFHelper/WFHelper) para uso y modificaciones propias.

## Base

- Punto de partida: **v2.1.1** (commit `06fa6897`).
- `origin` apunta a `Dark-Fell/WFHelper-Fell-Mod`; `upstream` al repositorio original.
- Los tags heredados del proyecto original fueron eliminados del fork.
- `remote.origin.tagOpt` y `remote.upstream.tagOpt` están en `--no-tags`, así que un `git fetch` normal no reintroduce los tags del upstream.

## Versionado

Los tags de este fork siguen el esquema `v2.1.1.<n>`:

| Tag | Significado |
| --- | --- |
| `v2.1.1.1` | Primera versión modificada |
| `v2.1.1.2` | Siguiente cambio |
| `v2.1.1.3` | ... |

- La `n` se incrementa con cada cambio publicado.
- `package.json` se mantiene en `2.1.1` porque npm/pnpm y electron-builder no aceptan versiones de cuatro números. El tag es la fuente de verdad del mod.

## Traducción al español

- `src/i18n/es.json` se integró desde el `app.asar` 2.1.1 (2.745 claves, cobertura completa salvo los textos que deben quedarse en inglés).
- Se descartó la clave `inventory.hideHighRankMods` porque no existe en el `en.json` de v2.1.1.
- Registro del idioma: `src/lib/i18n.ts` (`LocaleCode`, `LOCALE_OPTIONS`, `LOADERS`) e `ipc/overlayI18n.ts` (`DICTIONARIES`).
- `tests/main/i18n.test.ts` valida placeholders, claves desconocidas, textos solo en inglés, elipsis, cobertura y overlays también para español.

## Crear un tag

Con el árbol de trabajo limpio (cambios ya commiteados):

```powershell
pnpm mod:tag -- -m "descripción del cambio"
```

El script calcula la siguiente `n` a partir de los tags locales y remotos, crea un tag anotado en `HEAD` y lo sube a `origin`.

Opciones útiles:

```powershell
pnpm mod:tag -- --dry-run          # muestra el tag que se crearía, sin crear nada
pnpm mod:tag -- --no-push          # crea el tag solo en local
pnpm mod:tag -- --allow-dirty      # permite etiquetar con cambios sin commitear
```

Equivalente sin pnpm: `node scripts/mod-tag.mjs -m "descripción"`.
