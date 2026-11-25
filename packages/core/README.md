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
- [Campo de teléfono con React](#campo-de-teléfono-con-react)
- [Monedas](#monedas)
- [Fechas y hora local](#fechas-y-hora-local)
- [Países y monedas](#países-y-monedas)
- [Qué enviar al servidor](#qué-enviar-al-servidor)
- [Montos con Inertia](#montos-con-inertia)

## Importar solo lo que usa

Metro (React Native) no descarta el código que no se usa, así que importe desde el módulo que necesita:

| Importación | Contiene | Tamaño minificado |
|-------------|----------|-------------------|
| `@momotombodevs/istmo/money` | monedas | ~5 kB |
| `@momotombodevs/istmo/dates` | fechas y hora local | ~5 kB |
| `@momotombodevs/istmo/regions` | países, monedas y banderas | ~3 kB |
| `@momotombodevs/istmo/phone` | validar teléfonos (incluye libphonenumber) | ~49 kB |
| `@momotombodevs/istmo/phone-input` | formato mientras se escribe | ~68 kB |
| `@momotombodevs/istmo/react` | `usePhoneInput` (incluye `/phone` y `/phone-input`) | ~84 kB |
| `@momotombodevs/istmo` | todo menos `/react` | ~88 kB |

Los teléfonos usan [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) con la metadata recortada a los siete países (3 kB en lugar de 157 kB).

## Convenciones

- **`parse*`, `validate*` e `is*` nunca lanzan errores por lo que escribe una persona.** Devuelven `null`, `false` o `{ valid: false, error }`, también si reciben `undefined` o un número.
- **Todas lanzan `RangeError` cuando el programa las usa mal**: moneda, país u opción que no existe, o monto, fecha o instante con formato incorrecto en `format*`, `toMinorUnits` y `localDateTime`. Es un error de programación, nunca lo provoca lo que escribe la persona. Los mensajes no incluyen el valor recibido, para no filtrar datos personales a los logs.
- **El valor va primero y el país o la moneda al final**: `formatMoney(monto, moneda)`, `parsePhone(texto, país)`. Cuando lo único que se pasa es el país, va primero: `today('NI')`.
- **Los códigos van exactos, en mayúsculas** (`'NI'`, `'NIO'`), en los tipos y al ejecutar: `'ni'` lanza `RangeError`. Si el código viene de una API, compruébelo una vez con `isCountryCode` o `isCurrencyCode`, y después úselo con su tipo.
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

- `país` se usa para números escritos sin `+`. Si no es uno de los siete códigos exactos, lanza `RangeError`.
- `opciones.type`: `'mobile'` solo acepta números que reciben SMS o WhatsApp (`mobile` y `fixed_or_mobile`). Por defecto `'any'`. Otro valor lanza `RangeError`, así una opción mal escrita no deja pasar números fijos.
- `opciones.countries`: limita los países aceptados. Por defecto, los siete. Tiene que ser un arreglo de códigos exactos; si no, lanza `RangeError`.
- El número se escribe como grupos de dígitos separados por un espacio, `-`, `.` o `/`, con `+` opcional al inicio y un grupo entre paréntesis si se quiere: `+505 8123-4567`, `(+506) 8312 3456`, `8123.4567`. Cualquier otra cosa (letras, extensiones, `;`, `((`, `..`, separadores al final) se rechaza como `format`.

| `error` | Significado | Mensaje sugerido |
|---------|-------------|------------------|
| `format` | no es un teléfono | «Escriba solo el número.» |
| `missing_country` | número sin `+` y sin país por defecto | «Elija el país.» |
| `too_short` / `too_long` | le faltan o le sobran dígitos | «Al número le faltan dígitos.» |
| `country` | es de un país no aceptado | «Ese número no es de un país aceptado.» |
| `invalid` | tiene el largo correcto pero no existe | «Revise el número.» |
| `type` | se pidió celular y es fijo | «Escriba un número de celular.» |

`type` puede ser `mobile`, `fixed`, `fixed_or_mobile` (el plan de numeración no los distingue), `toll_free`, `premium`, `voip` u `other`.

Para el campo de texto hay dos ayudas más:

```ts
import { phoneExample } from '@momotombodevs/istmo/phone';
import { formatPhoneInput } from '@momotombodevs/istmo/phone-input';

formatPhoneInput('812345', 'NI').text;          // "8123 45": formato mientras se escribe
formatPhoneInput('(+506) 8312-3456', 'NI').text; // "+506 8312 3456"
formatPhoneInput('+506 8', 'NI').country;        // "CR": el país del código que se escribió
phoneExample('PA').national;                     // "6123-4567": para el placeholder
```

## Campo de teléfono con React

`usePhoneInput` maneja todo el campo: formato mientras se escribe, país elegido, cambio de país al escribir `+` y un código, borrado correcto de los espacios que agrega el formato, ejemplo para el placeholder y validación. No dibuja nada; el selector de bandera y el campo los pone su app con sus componentes. Sirve igual en React Native y en la web.

`react` es una dependencia opcional (React 18 o posterior): solo hace falta si importa `@momotombodevs/istmo/react`.

```tsx
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { PhoneError } from '@momotombodevs/istmo/phone';
import { usePhoneInput } from '@momotombodevs/istmo/react';

const messages: Record<PhoneError, string> = {
  format: 'Escriba solo el número.',
  missing_country: 'Elija el país.',
  too_short: 'Al número le faltan dígitos.',
  too_long: 'El número tiene dígitos de más.',
  country: 'Ese número no es de un país aceptado.',
  invalid: 'Revise el número.',
  type: 'Escriba un número de celular.',
};

export function PhoneField({ onChange }: { onChange: (e164: string | null) => void }) {
  const field = usePhoneInput({ defaultCountry: 'NI', type: 'mobile' });
  const [choosing, setChoosing] = useState(false);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setChoosing(true)} accessibilityLabel={`País: ${field.country.name}`}>
          <Text>{field.country.flag} +{field.country.callingCode}</Text>
        </Pressable>
        <TextInput
          value={field.value}
          onChangeText={field.onChangeText}
          onBlur={() => {
            field.onBlur();
            onChange(field.phone?.e164 ?? null);
          }}
          placeholder={field.placeholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>
      {field.error && <Text>{messages[field.error]}</Text>}

      <Modal visible={choosing} onRequestClose={() => setChoosing(false)}>
        {field.countries.map((country) => (
          <Pressable
            key={country.code}
            onPress={() => {
              field.setCountry(country.code);
              setChoosing(false);
            }}
          >
            <Text>{country.flag} {country.name} +{country.callingCode}</Text>
          </Pressable>
        ))}
      </Modal>
    </View>
  );
}
```

En la web, el mismo hook con un `<select>` y un `<input>`:

```tsx
import { usePhoneInput } from '@momotombodevs/istmo/react';

export function PhoneField() {
  const field = usePhoneInput({ defaultCountry: 'NI' });

  return (
    <div>
      <select value={field.country.code} onChange={(event) => field.setCountry(event.target.value as typeof field.country.code)}>
        {field.countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name} +{country.callingCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={field.value}
        onChange={(event) => field.onChangeText(event.target.value)}
        onBlur={field.onBlur}
        placeholder={field.placeholder}
      />
      <input type="hidden" name="phone" value={field.phone?.e164 ?? ''} />
    </div>
  );
}
```

| Valor | Qué es |
|-------|--------|
| `value`, `onChangeText`, `onBlur` | para conectar al campo de texto |
| `country`, `countries`, `setCountry` | país elegido (con `flag`, `name`, `callingCode`) y los que se pueden elegir |
| `placeholder` | número de ejemplo del país elegido |
| `phone` | el número válido (envíe `phone.e164`), o `null` mientras esté vacío o no sea válido |
| `error` | el motivo, solo después de que el campo perdió el foco una vez; `null` si está vacío o es válido |
| `reset()` | vuelve al valor inicial y oculta el error |

Opciones: `defaultCountry` (obligatoria), `type` y `countries` como en `validatePhone`, e `initialValue` con un número E.164 guardado para editarlo (`'+50581234567'`). El campo vacío no es un error: si el teléfono es obligatorio, compruebe `phone !== null` al enviar.

Las banderas son emoji (`country.flag`). Se ven en iOS, Android y macOS; los navegadores de Windows muestran las dos letras del código en su lugar.

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
- `parseMoney` acepta el símbolo o el código de esa moneda (sin importar mayúsculas), sus separadores de miles y de decimales, y en colones también el punto como decimal. En colones, el separador de miles puede ser un espacio, un espacio de no separación o un espacio fino; un salto de línea o un tabulador no. Devuelve siempre los decimales completos de la moneda. No acepta negativos, porque está pensado para lo que escribe una persona.
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

`instante` es un `Date`, milisegundos, o texto ISO 8601 **con** `Z` o desfase, con `T` y `Z` en mayúscula (`2026-11-24T20:30:00Z`). La librería lee el texto ella misma, sin `Date.parse`, así que Hermes y V8 dan el mismo resultado. Lanza `RangeError` con:

- un texto sin desfase, como `2026-11-24` o `2026-11-24T10:00`, porque su significado dependería de la zona del dispositivo;
- una fecha u hora que no existe, como `2026-02-30T10:00:00Z` o `24:00`, que `Date.parse` convertiría en otra fecha sin avisar.

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

## Montos con Inertia

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
