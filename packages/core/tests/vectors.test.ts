import { describe, expect, it } from 'vitest';
import {
  type CountryCode,
  countries,
  formatDate,
  formatMoney,
  fromMinorUnits,
  isCurrencyCode,
  isValidDate,
  isValidPhone,
  localDateTime,
  type PhoneOptions,
  parseDate,
  parseMoney,
  parsePhone,
  today,
  toMinorUnits,
  validatePhone,
  zonedDateTime,
} from '../src';
import vectors from './vectors.json';

describe('phone', () => {
  it.each(vectors.phone.valid)('parses $input ($country)', (vector) => {
    expect(parsePhone(vector.input, vector.country as CountryCode | null)).toEqual({
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
    expect(validatePhone(vector.input, vector.country as CountryCode | null, vector.options as PhoneOptions)).toEqual({
      valid: false,
      error: vector.error,
    });
  });

  it.each(vectors.phone.validWithOptions)('accepts $input with options', (vector) => {
    expect(isValidPhone(vector.input, vector.country as CountryCode, vector.options as PhoneOptions)).toBe(true);
  });

  it('refuses a default country outside Central America', () => {
    expect(() => parsePhone('8123 4567', 'MX' as CountryCode)).toThrow(RangeError);
  });
});

describe('money', () => {
  it.each(vectors.money.format)('formats $amount $currency', ({ amount, currency, options, expected }) => {
    expect(formatMoney(amount, currency, options as Parameters<typeof formatMoney>[2])).toBe(expected);
  });

  it.each(vectors.money.formatErrors)('refuses to format $amount $currency', ({ amount, currency }) => {
    expect(() => formatMoney(amount, currency)).toThrow(RangeError);
  });

  it.each(vectors.money.parse)('parses "$input" as $expected', ({ input, currency, expected }) => {
    expect(parseMoney(input, currency)).toBe(expected);
  });

  it.each(vectors.money.minorUnits)(
    'converts $amount $currency to minor units',
    ({ amount, currency, minor, back }) => {
      expect(toMinorUnits(amount, currency)).toBe(minor);
      expect(fromMinorUnits(minor, currency)).toBe(back);
    },
  );
});

describe('currency codes', () => {
  it.each(vectors.currencyCodes)('$code in $country is $expected', ({ code, country, expected }) => {
    expect(isCurrencyCode(code, country ?? undefined)).toBe(expected);
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
    expect(localDateTime(country, instant)).toEqual({ date, time, iso });
    expect(localDateTime(country, new Date(instant))).toEqual({ date, time, iso });
    expect(today(country, instant)).toBe(date);
  });

  it.each(vectors.dates.zoned)('builds $date $time in $country', ({ date, time, country, expected, utc }) => {
    const zoned = zonedDateTime(date, time, country);
    expect(zoned).toBe(expected);
    expect(new Date(zoned).toISOString()).toBe(utc.replace('Z', '.000Z'));
  });

  it.each(vectors.dates.zonedErrors)('refuses $date $time in $country', ({ date, time, country }) => {
    expect(() => zonedDateTime(date, time, country)).toThrow(RangeError);
  });
});

describe('time zone data', () => {
  it.each(countries)('$code keeps a fixed offset matching tzdata', ({ timezone, utcOffset }) => {
    const offsets = new Set(
      Array.from({ length: 24 }, (_, month) => {
        const instant = new Date(Date.UTC(2026 + Math.floor(month / 12), month % 12, 15));
        return new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
          .formatToParts(instant)
          .find(({ type }) => type === 'timeZoneName')?.value;
      }),
    );
    expect([...offsets]).toEqual([`GMT${utcOffset}`]);
  });
});
