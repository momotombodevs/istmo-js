# Contribuir

```
npm ci
npm run lint
npm run typecheck
npm test
npm run test:tz        # las pruebas en Tokio, Kiritimati y Los Ángeles
npm run build
npm run check:package  # publint y attw
npm run test:package   # instala el paquete empacado y lo usa con ESM, CJS y cada subruta
```

## Datos y casos de prueba compartidos

Este paquete y el de PHP, [`momotombo/istmo`](https://github.com/momotombodevs/istmo), tienen que validar igual. Por eso comparten dos archivos, que deben quedar idénticos byte a byte:

| Este repo | Repo de PHP |
|-----------|-------------|
| `packages/core/src/regions.json` | `data/regions.json` |
| `packages/core/tests/vectors.json` | `tests/vectors.json` |

Para cambiar un comportamiento, agregue o cambie el caso en `vectors.json`, implemente el cambio en los dos lenguajes, copie el archivo al otro repo y corra las pruebas en los dos.

## Metadata de teléfonos

`packages/core/src/phone-metadata.json` es la metadata de libphonenumber-js recortada a los siete países. Se genera con el script, no se edita a mano:

```
npm run build:metadata --workspace packages/core
```

`libphonenumber-js` está fijada a una versión exacta. Al actualizarla, regenere la metadata, corra las pruebas aquí y en el repo de PHP (que usa la librería de Google) y anote la versión en el CHANGELOG. El CI falla si la metadata no corresponde a la versión instalada.

## Publicar

La publicación la hace GitHub Actions con [trusted publishing](https://docs.npmjs.com/trusted-publishers) y provenance; nadie publica desde su máquina.

1. Configuración inicial (una sola vez): en npmjs.com, en el paquete `@momotombodevs/istmo`, agregue como publicador confiable el repo `momotombodevs/istmo-js`, el workflow `release.yml` y el entorno `npm`. En GitHub, cree el entorno `npm` con revisores requeridos.
2. Suba la versión en `packages/core/package.json` y mueva lo de `[Unreleased]` a esa versión en `CHANGELOG.md`.
3. Haga merge a `main`, cree la etiqueta `vX.Y.Z` y súbala. El workflow comprueba que la etiqueta coincida con la versión, corre todas las pruebas y publica.
