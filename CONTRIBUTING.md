# Contribuir

```
npm ci
npm run lint
npm run typecheck
npm test
npm run test:tz        # las pruebas en Tokio, Kiritimati y Los Ángeles
npm run build
npm run check:package  # publint y attw
npm run test:package   # instala el paquete empacado y lo usa con ESM, CJS, cada subruta y TypeScript estricto
```

## Casos de prueba

`packages/core/tests/vectors.json` describe el comportamiento con datos, sin código: entrada y resultado esperado. Para cambiar un comportamiento, cambie o agregue primero el caso ahí y véalo fallar. El archivo no depende del lenguaje, para que otra implementación (por ejemplo, una en PHP) pueda correr los mismos casos más adelante.

## Metadata de teléfonos

`packages/core/src/phone-metadata.json` es la metadata de libphonenumber-js recortada a los siete países. Se genera con el script, no se edita a mano:

```
npm run build:metadata --workspace packages/core
```

`libphonenumber-js` está fijada a una versión exacta. Al actualizarla, regenere la metadata, corra las pruebas y anote la versión en el CHANGELOG. El CI falla si la metadata no corresponde a la versión instalada.

## Publicar

La publicación la hace GitHub Actions con [trusted publishing](https://docs.npmjs.com/trusted-publishers) y provenance; nadie publica desde su máquina.

1. Configuración inicial (una sola vez): en npmjs.com, en el paquete `@momotombodevs/istmo`, agregue como publicador confiable el repo `momotombodevs/istmo-js`, el workflow `release.yml` y el entorno `npm`. En GitHub, cree el entorno `npm` con revisores requeridos.
2. Suba la versión en `packages/core/package.json` y mueva lo de `[Unreleased]` a esa versión en `CHANGELOG.md`.
3. Haga merge a `main`, cree la etiqueta `vX.Y.Z` y súbala. El workflow comprueba que la etiqueta coincida con la versión, corre todas las pruebas y publica.
