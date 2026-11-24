# @momotombo/istmo

Validación y formato de teléfonos, monedas y fechas de Centroamérica (Guatemala, Belice, El Salvador, Honduras, Nicaragua, Costa Rica y Panamá). Funciona en React, React Native y Expo, y en Node.

> Validate and format Central American phone numbers, currencies and dates. Same data and test cases as the PHP/Laravel package [`momotombo/istmo`](https://github.com/momotombodevs/istmo).

```
npm install @momotombo/istmo
```

En Expo: `npx expo install @momotombo/istmo`. No tiene código nativo, así que funciona en Expo Go.

## Teléfonos

Usa [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) y solo acepta números de los siete países.

```ts
import { isValidPhone, parsePhone, validatePhone } from '@momotombo/istmo';

parsePhone('8123 4567', 'NI');
// { country: 'NI', callingCode: '505', nationalNumber: '81234567', e164: '+50581234567',
//   national: '8123 4567', international: '+505 8123 4567', type: 'mobile' }

isValidPhone('2222 2222', 'NI', { type: 'mobile' });          // false: es fijo
isValidPhone('+506 8312 3456', 'NI', { countries: ['NI'] }); // false: es de Costa Rica

validatePhone('1234', 'NI'); // { valid: false, error: 'too_short' }
```

Errores: `format`, `too_short`, `too_long`, `country`, `invalid` y `type`.

## Monedas

GTQ, BZD, HNL, NIO, CRC, PAB y USD. Los montos viajan como texto para no perder centavos con floats.

```ts
import { formatMoney, isCurrencyCode, parseMoney, toMinorUnits } from '@momotombo/istmo';

formatMoney('1250.5', 'NIO');                      // "C$ 1,250.50"
formatMoney(180, 'NIO', { decimals: 'auto' });     // "C$ 180"
formatMoney('1234567.5', 'CRC');                   // "₡ 1 234 567,50"

parseMoney('C$ 1,250.50', 'NIO'); // "1250.50"
parseMoney('12.345', 'NIO');      // null

toMinorUnits('12.34', 'USD'); // 1234
isCurrencyCode('USD', 'NI');  // true
```

## Fechas y hora local

```ts
import { formatDate, localDateTime, parseDate, today, zonedDateTime } from '@momotombo/istmo';

parseDate('24/11/2026');  // "2026-11-24"
parseDate('29/02/2026');  // null
formatDate('2026-11-24'); // "24/11/2026"

today('NI');                                   // fecha de hoy en Managua, sin importar la zona del teléfono
localDateTime('PA', '2026-11-25T04:30:00Z');   // { date: '2026-11-24', time: '23:30', iso: '2026-11-24T23:30:00-05:00' }
zonedDateTime('2026-11-24', '14:30', 'NI');    // "2026-11-24T14:30:00-06:00"
```

La hora local no depende de `Intl` ni de la zona del dispositivo: ninguno de los siete países cambia de horario, así que se calcula con el desfase fijo de cada uno.

## Datos y pruebas compartidas

`packages/core/src/regions.json` y `packages/core/tests/vectors.json` son idénticos en este repo y en el de PHP. Si cambiás uno, copialo al otro y corré las pruebas en los dos.

## Licencia

MIT
