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
- [Campos de monto y de fecha con React](#campos-de-monto-y-de-fecha-con-react)

## Importar solo lo que usa

Metro (React Native) no descarta el código que no se usa, así que importe desde el módulo que necesita:

| Importación | Contiene | Tamaño minificado |
|-------------|----------|-------------------|
| `@momotombodevs/istmo/money` | monedas | ~6 kB |
| `@momotombodevs/istmo/dates` | fechas, horas y hora local | ~7 kB |
| `@momotombodevs/istmo/regions` | países, monedas y banderas | ~3 kB |
| `@momotombodevs/istmo/phone` | validar teléfonos (incluye libphonenumber) | ~49 kB |
| `@momotombodevs/istmo/phone-input` | formato mientras se escribe | ~68 kB |
| `@momotombodevs/istmo/react` | `usePhoneInput`, `useMoneyInput` y `useDateInput` (incluye todo lo anterior) | ~91 kB |
| `@momotombodevs/istmo` | todo menos `/react` | ~91 kB |

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

`usePhoneInput` maneja todo el campo: formato mientras se escribe sin que el cursor salte al final, país elegido, cambio de país al escribir `+` y un código, borrado correcto de los espacios que agrega el formato, ejemplo para el placeholder y validación. No dibuja nada; el selector de bandera y el campo los pone su app con sus componentes. Sirve igual en React Native y en la web.

`react` es una dependencia opcional (React 18 o posterior): solo hace falta si importa `@momotombodevs/istmo/react`.

Desestructure lo que devuelve el hook, como en los ejemplos. El resultado incluye `ref`, y con el React Compiler la regla `react-hooks/refs` marca como error leer `field.value` u otra propiedad del mismo objeto durante el render.

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

export function PhoneField({ onSave }: { onSave: (e164: string | null) => void }) {
  const { ref, value, onChangeText, onBlur, placeholder, phone, error, country, countries, setCountry } =
    usePhoneInput({ defaultCountry: 'NI', type: 'mobile' });
  const [choosing, setChoosing] = useState(false);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setChoosing(true)} accessibilityLabel={`País: ${country.name}`}>
          <Text>{country.flag} +{country.callingCode}</Text>
        </Pressable>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onBlur={() => {
            onBlur();
            onSave(phone?.e164 ?? null);
          }}
          placeholder={placeholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>
      {error && <Text>{messages[error]}</Text>}

      <Modal visible={choosing} onRequestClose={() => setChoosing(false)}>
        {countries.map((option) => (
          <Pressable
            key={option.code}
            onPress={() => {
              setCountry(option.code);
              setChoosing(false);
            }}
          >
            <Text>{option.flag} {option.name} +{option.callingCode}</Text>
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
  const { ref, value, onChangeText, onBlur, placeholder, phone, country, countries, setCountry } = usePhoneInput({
    defaultCountry: 'NI',
  });

  return (
    <div>
      <select value={country.code} onChange={(event) => setCountry(event.target.value as typeof country.code)}>
        {countries.map((option) => (
          <option key={option.code} value={option.code}>
            {option.flag} {option.name} +{option.callingCode}
          </option>
        ))}
      </select>
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      <input type="hidden" name="phone" value={phone?.e164 ?? ''} />
    </div>
  );
}
```

| Valor | Qué es |
|-------|--------|
| `ref`, `value`, `onChangeText`, `onBlur` | para conectar al campo de texto; `ref` mantiene el cursor donde está la persona cuando el formato agrega o quita espacios |
| `country`, `countries`, `setCountry` | país elegido (con `flag`, `name`, `callingCode`) y los que se pueden elegir |
| `placeholder` | número de ejemplo del país elegido |
| `phone` | el número válido (envíe `phone.e164`), o `null` mientras esté vacío o no sea válido |
| `error` | el motivo, solo después de que el campo perdió el foco una vez; `null` si está vacío o es válido |
| `reset()` | vuelve al valor inicial y oculta el error |

Opciones: `defaultCountry` (obligatoria), `type` y `countries` como en `validatePhone`, `initialValue` con un número E.164 guardado para editarlo (`'+50581234567'`), y `value`, `country` y `onChange` para controlarlo desde afuera. El campo vacío no es un error: si el teléfono es obligatorio, compruebe `phone !== null` al enviar.

### Con un store o una librería de formularios

Si el valor vive en otro lado (zustand, Redux, React Hook Form), pase `value` y `onChange`, y en el teléfono también `country`. El hook sigue formateando y cuidando el cursor, pero el valor es el suyo:

```tsx
const { phone, phoneCountry, setPhone } = useCustomerStore();
const { ref, value, onChangeText, onBlur } = usePhoneInput({
  defaultCountry: 'NI',
  value: phone,
  country: phoneCountry,
  onChange: (change) => setPhone(change.value, change.country),
});
```

`useMoneyInput` y `useDateInput` aceptan `value` y `onChange` con el texto del campo; el monto y la fecha se leen con `formatMoneyInput` y `formatDateInput`. Sin `value`, el hook guarda su propio estado y `onChange` solo avisa de cada cambio.

Las banderas son emoji (`country.flag`). Se ven en iOS, Android y macOS; los navegadores de Windows muestran las dos letras del código en su lugar. Para la web, el paquete trae las 7 banderas como SVG en `@momotombodevs/istmo/flags/<código>.svg`, tomadas de [flag-icons](https://github.com/lipis/flag-icons) (licencia MIT, incluida en `flags/LICENSE`). Son archivos, no JavaScript: Vite los importa como una URL y el navegador los carga aparte.

```tsx
import type { CountryCode } from '@momotombodevs/istmo/regions';
import bz from '@momotombodevs/istmo/flags/bz.svg';
import cr from '@momotombodevs/istmo/flags/cr.svg';
import gt from '@momotombodevs/istmo/flags/gt.svg';
import hn from '@momotombodevs/istmo/flags/hn.svg';
import ni from '@momotombodevs/istmo/flags/ni.svg';
import pa from '@momotombodevs/istmo/flags/pa.svg';
import sv from '@momotombodevs/istmo/flags/sv.svg';

const flags: Record<CountryCode, string> = { BZ: bz, CR: cr, GT: gt, HN: hn, NI: ni, PA: pa, SV: sv };

export function Flag({ code }: { code: CountryCode }) {
  return <img src={flags[code]} alt="" width={20} height={15} />;
}
```

## Monedas

GTQ, BZD, HNL, NIO, CRC, PAB y USD. Los montos se pasan como texto decimal (`"1250.50"`, como los guarda una columna `decimal`) para no perder centavos. También se aceptan números de JavaScript dentro del rango seguro.

```ts
import { formatMoney, fromMinorUnits, parseMoney, toMinorUnits } from '@momotombodevs/istmo/money';

formatMoney('1250.5', 'NIO');                         // "C$ 1,250.50"
formatMoney('1234567.5', 'CRC');                      // "₡ 1,234,567.50"
formatMoney('180', 'NIO', { decimals: 'auto' });      // "C$ 180"
formatMoney('1250.5', 'NIO', { display: 'code' });    // "NIO 1,250.50"
formatMoney('1250.5', 'NIO', { display: 'none' });    // "1,250.50"
formatMoney('-15', 'USD');                            // "-$ 15.00"

parseMoney('C$ 1,250.50', 'NIO'); // "1250.50"
parseMoney('1,250', 'NIO');       // "1250.00"
parseMoney('₡1 234,5', 'CRC');    // "1234.50"
parseMoney('1.250,50', 'NIO');    // "1250.50": también con punto de miles y coma decimal
parseMoney('12.345', 'NIO');      // "12345.00": tres dígitos después del separador son miles
parseMoney('12.3456', 'NIO');     // null
parseMoney('$20', 'NIO');         // null: símbolo de otra moneda
parseMoney('-50', 'USD');         // null: no acepta negativos

toMinorUnits('12.34', 'USD');  // 1234
fromMinorUnits(1234, 'USD');   // "12.34"
```

- `formatMoney` redondea la mitad hacia afuera sobre el texto decimal: `1.005` da `1.01` y `2.345` da `2.35`. Entre el símbolo y el número va un espacio de no separación (` `), para que no queden en líneas distintas.
- `parseMoney` acepta el símbolo o el código de esa moneda (sin importar mayúsculas) y las tres formas en que se escriben montos en la región: `1,234.50`, `1.234,50` y `1 234,50`. Un separador seguido de uno o dos dígitos al final es el decimal; los demás tienen que ser todos iguales y agrupar de a tres dígitos, por eso `12.345` son doce mil. Devuelve siempre los decimales completos de la moneda. No acepta negativos, porque está pensado para lo que escribe una persona.
- La parte entera admite hasta 30 dígitos (`MAX_INTEGER_DIGITS`) y `parseMoney` ignora textos de más de 64 caracteres, así un texto pegado muy largo no congela la pantalla.

| Moneda | Ejemplo |
|--------|---------|
| GTQ, quetzal | `Q 1,250.50` |
| BZD, dólar beliceño | `BZ$ 1,250.50` |
| HNL, lempira | `L 1,250.50` |
| NIO, córdoba | `C$ 1,250.50` |
| CRC, colón | `₡ 1,250.50` |
| PAB, balboa | `B/. 1,250.50` |
| USD, dólar | `$ 1,250.50` |

Para un campo de texto, `formatMoneyInput` agrupa los miles mientras se escribe:

```ts
import { formatMoneyInput } from '@momotombodevs/istmo/money';

formatMoneyInput('1250.5', 'NIO').text;   // "1,250.5"
formatMoneyInput('1250.5', 'NIO').amount; // "1250.50"
formatMoneyInput('.', 'NIO').text;        // "0."
```

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

Horas, fechas en palabras, edad y días entre fechas:

```ts
import { ageOn, daysBetween, formatDateInput, formatLongDate, formatTime, parseTime } from '@momotombodevs/istmo/dates';

parseTime('2:30 p. m.');                   // "14:30"
parseTime('12 am');                        // "00:00"
formatTime('14:30');                       // "2:30 p. m."
formatTime('14:30', { clock: '24h' });     // "14:30"
formatLongDate('2026-11-24');              // "martes 24 de noviembre de 2026"
formatLongDate('2026-11-24', { weekday: false, year: false }); // "24 de noviembre"
daysBetween('2026-11-24', '2026-12-25');   // 31
ageOn('2008-11-24', '2026-11-24');         // 18
formatDateInput('24112026').text;          // "24/11/2026": formato mientras se escribe
formatDateInput('1/2/2026').date;          // "2026-02-01"
```

`parseTime` acepta `14:30`, `2:30 pm`, `2:30 p. m.`, `2 pm` y `12 am`; una hora sin minutos ni `am`/`pm` (`2`) es ambigua y da `null`. `formatTime` escribe `a. m.` y `p. m.`, como se leen en la región.

`instante` es un `Date`, milisegundos, o texto ISO 8601 **con** `Z` o desfase, con `T` y `Z` en mayúscula (`2026-11-24T20:30:00Z`). La librería lee el texto ella misma, sin `Date.parse`, así que Hermes y V8 dan el mismo resultado. Lanza `RangeError` con:

- un texto sin desfase, como `2026-11-24` o `2026-11-24T10:00`, porque su significado dependería de la zona del dispositivo;
- una fecha u hora que no existe, como `2026-02-30T10:00:00Z` o `24:00`, que `Date.parse` convertiría en otra fecha sin avisar.

## Países y monedas

```ts
import { acceptsCurrency, country, currency, isCountryCode } from '@momotombodevs/istmo/regions';

country('NI');
// { code: 'NI', name: 'Nicaragua', callingCode: '505', currency: 'NIO', currencies: ['NIO', 'USD'],
//   timezone: 'America/Managua', utcOffset: '-06:00' }

currency('CRC'); // { code: 'CRC', name: 'Colón costarricense', symbol: '₡', decimals: 2, decimalSeparator: '.', groupSeparator: ',' }

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

## Campos de monto y de fecha con React

`useMoneyInput` y `useDateInput` funcionan igual que `usePhoneInput`: formatean mientras se escribe, mantienen el cursor donde está la persona si les pasa `ref`, muestran el error después de que el campo pierde el foco y no dibujan nada.

```tsx
import { Text, TextInput, View } from 'react-native';
import { today } from '@momotombodevs/istmo/dates';
import { useDateInput, useMoneyInput } from '@momotombodevs/istmo/react';

export function TipField() {
  const { ref, value, onChangeText, onBlur, currency, error } = useMoneyInput({ currency: 'NIO', max: '1000' });

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <Text>{currency.symbol}</Text>
        <TextInput ref={ref} value={value} onChangeText={onChangeText} onBlur={onBlur} keyboardType="decimal-pad" />
      </View>
      {error === 'max' && <Text>La propina máxima es C$ 1,000.</Text>}
    </View>
  );
}

export function DeliveryDayField() {
  const { ref, value, onChangeText, onBlur, placeholder, error } = useDateInput({ min: today('NI') });

  return (
    <View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        keyboardType="number-pad"
      />
      {error && <Text>Elija una fecha válida, de hoy en adelante.</Text>}
    </View>
  );
}
```

| Hook | Opciones | Devuelve |
|------|----------|----------|
| `useMoneyInput` | `currency`, `initialValue`, `min`, `max`, `value`, `onChange` | `amount` (`"1250.50"`, listo para enviar), `currency` (con `symbol`), `error`: `format`, `min` o `max` |
| `useDateInput` | `initialValue` (`YYYY-MM-DD`), `min`, `max`, `value`, `onChange` | `date` (`YYYY-MM-DD`), `placeholder` (`dd/mm/aaaa`), `error`: `format`, `min` o `max` |

`useMoneyInput` toma la `,` del teclado decimal en español como punto decimal (en Android, el teclado `decimal-pad` muestra `,` según el idioma), lee un monto pegado en cualquiera de las tres formas y completa los decimales al salir del campo (`1,250.5` → `1,250.50`).

En la web, con Inertia, el monto se envía ya normalizado:

```tsx
import { useForm } from '@inertiajs/react';
import { useMoneyInput } from '@momotombodevs/istmo/react';

export function PriceForm() {
  const { ref, value, onChangeText, onBlur, amount, error } = useMoneyInput({ currency: 'NIO', min: '1' });
  const form = useForm({});

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (amount === null) return;
        form.transform(() => ({ price: amount, currency: 'NIO' })).post('/prices');
      }}
    >
      <input ref={ref} inputMode="decimal" value={value} onChange={(event) => onChangeText(event.target.value)} onBlur={onBlur} />
      {error && <p>Escriba un monto de C$ 1 o más.</p>}
    </form>
  );
}
```

## Licencia

MIT
