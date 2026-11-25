# @momotombodevs/istmo

[![ci](https://github.com/momotombodevs/istmo-js/actions/workflows/ci.yml/badge.svg)](https://github.com/momotombodevs/istmo-js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@momotombodevs/istmo)](https://www.npmjs.com/package/@momotombodevs/istmo)
[![Licencia](https://img.shields.io/npm/l/@momotombodevs/istmo)](LICENSE)

Teléfonos, monedas y fechas de Centroamérica: Guatemala, Belice, El Salvador, Honduras, Nicaragua, Costa Rica y Panamá. Funciona en React, React Native (Expo, Hermes) y Node, sin código nativo.

> Validate and format Central American phone numbers, money amounts and `dd/mm/yyyy` dates, and read the local time of each country. Docs are in Spanish; the API and the TSDoc in your editor are in English.

```
npm install @momotombodevs/istmo
```

En Expo use `npx expo install @momotombodevs/istmo`. Funciona en Expo Go.

## Contenido

- [Importar solo lo que usa](#importar-solo-lo-que-usa)
- [Convenciones](#convenciones)
- [Teléfonos](#teléfonos)
- [Monedas](#monedas)
- [Fechas y hora local](#fechas-y-hora-local)
- [Países y monedas](#países-y-monedas)
- [Qué enviar al servidor](#qué-enviar-al-servidor)
- [Ejemplos con React](#ejemplos-con-react)

## Importar solo lo que usa

Metro (React Native) no descarta el código que no se usa, así que importe desde el módulo que necesita:

| Importación | Contiene | Tamaño minificado |
|-------------|----------|-------------------|
| `@momotombodevs/istmo/money` | monedas | ~5 kB |
| `@momotombodevs/istmo/dates` | fechas y hora local | ~4 kB |
| `@momotombodevs/istmo/regions` | países y monedas | ~3 kB |
| `@momotombodevs/istmo/phone` | teléfonos (incluye libphonenumber) | ~48 kB |
| `@momotombodevs/istmo` | todo | ~53 kB |

Los teléfonos usan [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) con la metadata recortada a los siete países (3 kB en lugar de 157 kB).

## Convenciones

- **`parse*`, `validate*` e `is*` nunca lanzan errores por lo que escribe una persona.** Devuelven `null`, `false` o `{ valid: false, error }`, también si reciben `undefined` o un número.
- **`format*`, `toMinorUnits`, `localDateTime` y similares lanzan `RangeError` cuando el programa los usa mal**: moneda o país no soportado, monto o fecha con formato incorrecto. Los mensajes no incluyen el valor recibido, para no filtrar datos personales a los logs.
- **El valor va primero y el país o la moneda al final**: `formatMoney(monto, moneda)`, `parsePhone(texto, país)`. Cuando lo único que se pasa es el país, va primero: `today('NI')`.
- **Los códigos van en mayúsculas** (`'NI'`, `'NIO'`). Las funciones aceptan minúsculas, pero los tipos de TypeScript solo aceptan mayúsculas, y `isCountryCode` e `isCurrencyCode` solo dan `true` con mayúsculas exactas.
- **Los datos exportados están congelados** (`Object.freeze`): ningún código puede cambiarlos.

## Teléfonos

```ts
import { isValidPhone, parsePhone, validatePhone } from '@momotombodevs/istmo/phone';

parsePhone('8123 4567', 'NI');
// {
//   country: 'NI',
//   callingCode: '505',
//   nationalNumber: '81234567',
//   e164: '+50581234567',          guarde y envíe este
//   national: '8123 4567',
//   international: '+505 8123 4567',
//   type: 'mobile',
// }

parsePhone('+506 8312-3456');                                // de Costa Rica, no hace falta país por defecto
isValidPhone('2222 2222', 'NI', { type: 'mobile' });          // false: es fijo
isValidPhone('+506 8312 3456', 'NI', { countries: ['NI'] }); // false: es de Costa Rica

validatePhone('1234', 'NI'); // { valid: false, error: 'too_short' }
```

| Función | Devuelve |
|---------|----------|
| `validatePhone(texto, país?, opciones?)` | `{ valid: true, phone }` o `{ valid: false, error }` |
| `parsePhone(texto, país?, opciones?)` | `Phone` o `null` |
| `isValidPhone(texto, país?, opciones?)` | `boolean` |

- `país` se usa para números escritos sin `+`. Si no es uno de los siete países, lanza `RangeError`.
- `opciones.type`: `'mobile'` solo acepta números que reciben SMS o WhatsApp (`mobile` y `fixed_or_mobile`). Por defecto `'any'`.
- `opciones.countries`: limita los países aceptados. Por defecto, los siete.
- Se aceptan dígitos, espacios, `+`, `-`, `.`, `/` y paréntesis. Cualquier otro texto (letras, extensiones, `;`) se rechaza como `format`.

| `error` | Significado | Mensaje sugerido |
|---------|-------------|------------------|
| `format` | no es un teléfono | «Escriba solo el número.» |
| `missing_country` | número sin `+` y sin país por defecto | «Elija el país.» |
| `too_short` / `too_long` | le faltan o le sobran dígitos | «Al número le faltan dígitos.» |
| `country` | es de un país no aceptado | «Ese número no es de un país aceptado.» |
| `invalid` | tiene el largo correcto pero no existe | «Revise el número.» |
| `type` | se pidió celular y es fijo | «Escriba un número de celular.» |

`type` puede ser `mobile`, `fixed`, `fixed_or_mobile` (el plan de numeración no los distingue), `toll_free`, `premium`, `voip` u `other`.

## Monedas

GTQ, BZD, HNL, NIO, CRC, PAB y USD. Los montos se pasan como texto decimal (`"1250.50"`, como los guarda una columna `decimal`) para no perder centavos. También se aceptan números de JavaScript dentro del rango seguro.

```ts
import { formatMoney, fromMinorUnits, parseMoney, toMinorUnits } from '@momotombodevs/istmo/money';

formatMoney('1250.5', 'NIO');                         // "C$ 1,250.50"
formatMoney('1234567.5', 'CRC');                      // "₡ 1 234 567,50"
formatMoney('180', 'NIO', { decimals: 'auto' });      // "C$ 180"
formatMoney('1250.5', 'NIO', { display: 'code' });    // "NIO 1,250.50"
formatMoney('1250.5', 'NIO', { display: 'none' });    // "1,250.50"
formatMoney('-15', 'USD');                            // "-$ 15.00"

parseMoney('C$ 1,250.50', 'NIO'); // "1250.50"
parseMoney('1,250', 'NIO');       // "1250.00"
parseMoney('₡1 234,5', 'CRC');    // "1234.50"
parseMoney('12.345', 'NIO');      // null: más decimales de los que tiene la moneda
parseMoney('$20', 'NIO');         // null: símbolo de otra moneda
parseMoney('-50', 'USD');         // null: no acepta negativos

toMinorUnits('12.34', 'USD');  // 1234
fromMinorUnits(1234, 'USD');   // "12.34"
```

- `formatMoney` redondea la mitad hacia afuera sobre el texto decimal: `1.005` da `1.01` y `2.345` da `2.35`. Entre el símbolo y el número va un espacio de no separación (` `), para que no queden en líneas distintas.
- `parseMoney` acepta el símbolo o el código de esa moneda (sin importar mayúsculas), sus separadores de miles y de decimales, y en colones también el punto como decimal. Devuelve siempre los decimales completos de la moneda. No acepta negativos, porque está pensado para lo que escribe una persona.
- La parte entera admite hasta 30 dígitos (`MAX_INTEGER_DIGITS`) y `parseMoney` ignora textos de más de 64 caracteres, así un texto pegado muy largo no congela la pantalla.

| Moneda | Ejemplo |
|--------|---------|
| GTQ, quetzal | `Q 1,250.50` |
| BZD, dólar beliceño | `BZ$ 1,250.50` |
| HNL, lempira | `L 1,250.50` |
| NIO, córdoba | `C$ 1,250.50` |
| CRC, colón | `₡ 1 250,50` |
| PAB, balboa | `B/. 1,250.50` |
| USD, dólar | `$ 1,250.50` |

## Fechas y hora local

Ninguno de los siete países cambia de horario. Panamá está en UTC-5 y los demás en UTC-6, así que la hora local se calcula con ese desfase fijo, sin `Intl` y sin depender de la zona del teléfono o del servidor.

```ts
import { formatDate, localDateTime, parseDate, today, zonedDateTime } from '@momotombodevs/istmo/dates';

parseDate('24/11/2026');  // "2026-11-24"
parseDate('1/2/2026');    // "2026-02-01"
parseDate('29/02/2026');  // null: 2026 no es bisiesto
formatDate('2026-11-24'); // "24/11/2026"

today('NI');                                   // fecha de hoy en Managua
localDateTime('PA', '2026-11-25T04:30:00Z');   // { date: '2026-11-24', time: '23:30', iso: '2026-11-24T23:30:00-05:00' }
zonedDateTime('2026-11-24', '14:30', 'NI');    // "2026-11-24T14:30:00-06:00"
```

| Función | Devuelve |
|---------|----------|
| `parseDate(texto)` | `"YYYY-MM-DD"` o `null`. Acepta `dd/mm/aaaa`, `d/m/aaaa` y `dd-mm-aaaa`. |
| `isValidDate(texto)` | `boolean` |
| `formatDate("YYYY-MM-DD")` | `"dd/mm/aaaa"`. Lanza `RangeError` si la fecha no existe. |
| `today(país, instante?)` | `"YYYY-MM-DD"` en ese país |
| `localDateTime(país, instante?)` | `{ date, time, iso }` en ese país |
| `zonedDateTime(fecha, "HH:MM", país)` | ISO 8601 con el desfase del país, para enviar una fecha y hora elegidas (una reserva, una entrega) |

`instante` es un `Date`, milisegundos, o texto ISO 8601 **con** `Z` o desfase (`2026-11-24T20:30:00Z`). Un texto sin desfase, como `2026-11-24` o `2026-11-24T10:00`, lanza `RangeError`, porque su significado dependería de la zona del dispositivo.

## Países y monedas

```ts
import { acceptsCurrency, country, currency, isCountryCode } from '@momotombodevs/istmo/regions';

country('NI');
// { code: 'NI', name: 'Nicaragua', callingCode: '505', currency: 'NIO', currencies: ['NIO', 'USD'],
//   timezone: 'America/Managua', utcOffset: '-06:00' }

currency('CRC'); // { code: 'CRC', name: 'Colón costarricense', symbol: '₡', decimals: 2, decimalSeparator: ',', groupSeparator: ' ' }

acceptsCurrency('NI', 'USD'); // true
acceptsCurrency('NI', 'GTQ'); // false

const code: unknown = response.country;
if (isCountryCode(code)) {
  country(code); // aquí code ya es CountryCode
}
```

También exporta `countries`, `currencies`, `countryCodes`, `currencyCodes` e `isCurrencyCode`. El Salvador y Panamá usan USD como moneda principal; Panamá también acepta PAB.

## Qué enviar al servidor

La validación en la app es para dar buena experiencia; el servidor siempre tiene que validar otra vez. Envíe los valores normalizados, no lo que escribió la persona:

| Dato | Envíe |
|------|-------|
| Teléfono | `phone.e164` y `phone.country` |
| Monto | el resultado de `parseMoney`, con la moneda |
| Fecha | el resultado de `parseDate` (`YYYY-MM-DD`) |
| Fecha y hora elegidas | el resultado de `zonedDateTime` |

El paquete PHP/Laravel [`momotombo/istmo`](https://github.com/momotombodevs/istmo) usa los mismos datos y los mismos casos de prueba, así que valida igual en el servidor.

## Ejemplos con React

Un campo de teléfono en React Native que entrega el número normalizado:

```tsx
import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { type PhoneError, validatePhone } from '@momotombodevs/istmo/phone';

const messages: Record<PhoneError, string> = {
  format: 'Escriba solo el número.',
  missing_country: 'Elija el país.',
  too_short: 'Al número le faltan dígitos.',
  too_long: 'El número tiene dígitos de más.',
  country: 'Ese número no es de un país aceptado.',
  invalid: 'Revise el número.',
  type: 'Escriba un número de celular.',
};

export function PhoneField({ onValid }: { onValid: (e164: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TextInput
        keyboardType="phone-pad"
        onEndEditing={({ nativeEvent }) => {
          const result = validatePhone(nativeEvent.text, 'NI', { type: 'mobile' });
          setError(result.valid ? null : messages[result.error]);
          if (result.valid) onValid(result.phone.e164);
        }}
      />
      {error && <Text>{error}</Text>}
    </>
  );
}
```

Un monto en un formulario de Inertia que se envía ya normalizado:

```tsx
import { useForm } from '@inertiajs/react';
import { parseMoney } from '@momotombodevs/istmo/money';

export function PriceForm() {
  const form = useForm({ price: '' });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const price = parseMoney(form.data.price, 'NIO');
        if (price === null) return form.setError('price', 'Escriba un monto como 1,250.50');
        form.transform(() => ({ price, currency: 'NIO' })).post('/prices');
      }}
    >
      <input inputMode="decimal" value={form.data.price} onChange={(event) => form.setData('price', event.target.value)} />
      {form.errors.price && <p>{form.errors.price}</p>}
    </form>
  );
}
```

## Licencia

MIT
