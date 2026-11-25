import { describe, expect, it } from 'vitest';
import {
  acceptsCurrency,
  type CountryCode,
  type CurrencyCode,
  country,
  formatDate,
  formatMoney,
  formatPhoneInput,
  fromMinorUnits,
  type IsoDate,
  isCountryCode,
  isCurrencyCode,
  isValidDate,
  isValidPhone,
  localDateTime,
  type PhoneOptions,
  parseDate,
  parseMoney,
  parsePhone,
  phoneExample,
  today,
  toMinorUnits,
  validatePhone,
  zonedDateTime,
} from '../src';
import vectors from './vectors.json';

const asCurrency = (code: string) => code as CurrencyCode;
const asCountry = (code: string | null) => code as CountryCode | null;

describe('phone', () => {
  it.each(vectors.phone.valid)('parses $input ($country)', (vector) => {
    expect(parsePhone(vector.input, asCountry(vector.country))).toEqual({
      country: vector.region,
      callingCode: vector.e164.slice(1, 4),
      nationalNumber: vector.e164.slice(4),
      e164: vector.e164,
      national: vector.national,
      international: vector.international,
      type: vector.type,
    });
  });

  it.each(vectors.phone.invalid)('rejects "$input" as $error', (vector) => {
    expect(validatePhone(vector.input, asCountry(vector.country), vector.options as PhoneOptions)).toEqual({
      valid: false,
      error: vector.error,
    });
  });

  it.each(vectors.phone.optionErrors)('refuses options $options with country $country', (vector) => {
    expect(() =>
      validatePhone(vector.input, vector.country as CountryCode, vector.options as unknown as PhoneOptions),
    ).toThrow(RangeError);
  });

  it.each(vectors.phone.typing)('formats "$input" while typing in $country', ({ input, country, text, detected }) => {
    expect(formatPhoneInput(input, country as CountryCode)).toEqual({ text, country: detected ?? undefined });
  });

  it.each(vectors.phone.examples)('gives an example number for $country', ({ country, national }) => {
    expect(phoneExample(country as CountryCode).national).toBe(national);
  });

  it.each(vectors.phone.validWithOptions)('accepts $input with options', (vector) => {
    expect(isValidPhone(vector.input, asCountry(vector.country), vector.options as PhoneOptions)).toBe(true);
  });
});

describe('money', () => {
  it.each(vectors.money.format)('formats $amount $currency', ({ amount, currency, options, expected }) => {
    expect(formatMoney(amount, asCurrency(currency), options as Parameters<typeof formatMoney>[2])).toBe(expected);
  });

  it.each(vectors.money.formatErrors)('refuses to format $amount $currency', ({ amount, currency }) => {
    expect(() => formatMoney(amount, asCurrency(currency))).toThrow(RangeError);
  });

  it.each(vectors.money.parse)('parses "$input" as $expected', ({ input, currency, expected }) => {
    expect(parseMoney(input, asCurrency(currency))).toBe(expected);
  });

  it.each(vectors.money.parseErrors)('refuses to parse with currency $currency', ({ input, currency }) => {
    expect(() => parseMoney(input, asCurrency(currency))).toThrow(RangeError);
  });

  it.each(vectors.money.minorUnits)(
    'converts $amount $currency to minor units',
    ({ amount, currency, minor, back }) => {
      expect(toMinorUnits(amount, asCurrency(currency))).toBe(minor);
      expect(fromMinorUnits(minor, asCurrency(currency))).toBe(back);
    },
  );
});

describe('codes', () => {
  it.each(vectors.flags)('$country has the flag $flag', ({ country: code, flag }) => {
    expect(country(code as CountryCode)?.flag).toBe(flag);
  });

  it.each(vectors.currencyCodes)('isCurrencyCode("$code") is $expected', ({ code, expected }) => {
    expect(isCurrencyCode(code)).toBe(expected);
  });

  it.each(vectors.countryCodes)('isCountryCode("$code") is $expected', ({ code, expected }) => {
    expect(isCountryCode(code)).toBe(expected);
  });

  it.each(vectors.acceptsCurrency)('$country accepts $currency: $expected', ({ country, currency, expected }) => {
    expect(acceptsCurrency(country as CountryCode, asCurrency(currency))).toBe(expected);
  });
});

describe('dates', () => {
  it.each(vectors.dates.parse)('parses "$input" as $expected', ({ input, expected }) => {
    expect(parseDate(input)).toBe(expected);
    expect(isValidDate(input)).toBe(expected !== null);
  });

  it.each(vectors.dates.format)('formats $date', ({ date, expected }) => {
    expect(formatDate(date)).toBe(expected);
  });

  it.each(vectors.dates.formatErrors)('refuses to format %s', (date) => {
    expect(() => formatDate(date)).toThrow(RangeError);
  });

  it.each(vectors.dates.local)('reads $instant in $country', ({ instant, country, date, time, iso }) => {
    const code = country as CountryCode;
    expect(localDateTime(code, instant)).toEqual({ date, time, iso });
    expect(localDateTime(code, new Date(instant))).toEqual({ date, time, iso });
    expect(localDateTime(code, Date.parse(instant))).toEqual({ date, time, iso });
    expect(today(code, instant)).toBe(date);
  });

  it.each(vectors.dates.localErrors)('refuses $instant in $country', ({ instant, country }) => {
    expect(() => localDateTime(country as CountryCode, instant)).toThrow(RangeError);
  });

  it.each(vectors.dates.zoned)('builds $date $time in $country', ({ date, time, country, expected, utc }) => {
    const zoned = zonedDateTime(date as IsoDate, time, country as CountryCode);
    expect(zoned).toBe(expected);
    expect(new Date(zoned).toISOString()).toBe(utc.replace('Z', '.000Z'));
  });

  it.each(vectors.dates.zonedErrors)('refuses $date $time in $country', ({ date, time, country }) => {
    expect(() => zonedDateTime(date as IsoDate, time, country as CountryCode)).toThrow(RangeError);
  });
});
