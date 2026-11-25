import { describe, expect, it } from 'vitest';
import {
  type CountryCode,
  type CurrencyCode,
  countries,
  country,
  countryCodes,
  currencies,
  currency,
  currencyCodes,
  formatDate,
  formatMoney,
  fromMinorUnits,
  isValidDate,
  isValidPhone,
  localDateTime,
  parseDate,
  parseMoney,
  parsePhone,
  toMinorUnits,
  validatePhone,
  zonedDateTime,
} from '../src';

describe('untrusted input never throws from parsers and predicates', () => {
  it.each([undefined, null, 81234567, {}, []])('handles %j', (value) => {
    expect(validatePhone(value, 'NI')).toEqual({ valid: false, error: 'format' });
    expect(parsePhone(value, 'NI')).toBeNull();
    expect(isValidPhone(value, 'NI')).toBe(false);
    expect(parseMoney(value, 'NIO')).toBeNull();
    expect(parseDate(value)).toBeNull();
    expect(isValidDate(value)).toBe(false);
  });
});

describe('misuse fails loudly', () => {
  it('refuses a default country outside Central America', () => {
    expect(() => parsePhone('8123 4567', 'MX' as CountryCode)).toThrow(RangeError);
  });

  it('accepts a lowercase default country', () => {
    expect(parsePhone('8123 4567', 'ni' as CountryCode)?.e164).toBe('+50581234567');
  });

  it('refuses numbers outside the safe integer range', () => {
    expect(() => formatMoney(2 ** 53, 'USD')).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, 'USD')).toThrow(RangeError);
    expect(() => toMinorUnits('100000000000000000', 'USD')).toThrow(RangeError);
    expect(() => fromMinorUnits(12.5, 'USD')).toThrow(RangeError);
  });

  it('refuses an instant out of range', () => {
    expect(() => localDateTime('NI', -8.64e15)).toThrow(RangeError);
    expect(() => localDateTime('NI', new Date(Number.NaN))).toThrow(RangeError);
  });

  it('keeps user input out of error messages', () => {
    expect(() => formatMoney('card 4111111111111111', 'USD')).toThrow(/^(?!.*4111)/);
  });
});

describe('long input stays fast', () => {
  it('formats and parses the longest accepted amount quickly', () => {
    const started = performance.now();
    expect(parseMoney('9'.repeat(1_000_000), 'NIO')).toBeNull();
    expect(formatMoney('9'.repeat(30), 'NIO')).toMatch(/^C\$ 999,/);
    expect(() => formatMoney('9'.repeat(100_000), 'NIO')).toThrow(RangeError);
    expect(validatePhone('8'.repeat(1_000_000), 'NI')).toEqual({ valid: false, error: 'format' });
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe('shared data is frozen', () => {
  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(countries)).toBe(true);
    expect(Object.isFrozen(countries[0])).toBe(true);
    expect(Object.isFrozen(countries[0]?.currencies)).toBe(true);
    expect(Object.isFrozen(currencies[0])).toBe(true);
    expect(Object.isFrozen(countryCodes)).toBe(true);
    expect(() => (countries as unknown[]).push({})).toThrow(TypeError);
  });

  it('matches the declared types', () => {
    for (const entry of countries) {
      expect(currencyCodes).toContain(entry.currency);
      expect(entry.currencies[0]).toBe(entry.currency);
      for (const code of entry.currencies) expect(currencyCodes).toContain(code);
      expect(entry.utcOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
    }
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

describe('lookups with untrusted codes', () => {
  it('returns nothing for non-string codes', () => {
    expect(country(undefined as unknown as CountryCode)).toBeUndefined();
    expect(currency(42 as unknown as CurrencyCode)).toBeUndefined();
  });

  it('refuses non-string dates and times', () => {
    expect(() => formatDate(20261124 as unknown as string)).toThrow(RangeError);
    expect(() => zonedDateTime('2026-11-24', 1430 as unknown as string, 'NI')).toThrow(RangeError);
  });
});
