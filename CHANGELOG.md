# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.0]

### Añadido

- Teléfonos: `validatePhone`, `parsePhone` e `isValidPhone` para los siete países de Centroamérica, con metadata de libphonenumber-js 1.13.17 recortada a esos países.
- Monedas: `formatMoney`, `parseMoney`, `toMinorUnits` y `fromMinorUnits` para GTQ, BZD, HNL, NIO, CRC, PAB y USD.
- Fechas: `parseDate`, `isValidDate` y `formatDate` para `dd/mm/aaaa`; `today`, `localDateTime` y `zonedDateTime` con la hora local de cada país.
- Países y monedas: `countries`, `currencies`, `country`, `currency`, `isCountryCode`, `isCurrencyCode` y `acceptsCurrency`.
- Subrutas `@momotombo/istmo/phone`, `/money`, `/dates` y `/regions` para no cargar lo que no se usa en Metro.

[Unreleased]: https://github.com/momotombodevs/istmo-js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/momotombodevs/istmo-js/releases/tag/v0.1.0
