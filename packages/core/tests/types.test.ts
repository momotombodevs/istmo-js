import { describe, expectTypeOf, it } from 'vitest';
import {
  type Country,
  type CountryCode,
  type CurrencyCode,
  country,
  countryCodes,
  formatMoney,
  type IsoDate,
  isCountryCode,
  type Phone,
  type PhoneError,
  parseDate,
  parsePhone,
  validatePhone,
} from '../src';

describe('types guide TypeScript users', () => {
  it('narrows the phone validation result', () => {
    const result = validatePhone('8123 4567', 'NI');
    if (result.valid) {
      expectTypeOf(result.phone).toEqualTypeOf<Phone>();
      expectTypeOf(result.phone.country).toEqualTypeOf<CountryCode>();
    } else {
      expectTypeOf(result.error).toEqualTypeOf<PhoneError>();
    }
    expectTypeOf(parsePhone('8123 4567', 'NI')).toEqualTypeOf<Phone | null>();
  });

  it('derives the code unions from the code lists', () => {
    expectTypeOf<CountryCode>().toEqualTypeOf<'GT' | 'BZ' | 'SV' | 'HN' | 'NI' | 'CR' | 'PA'>();
    expectTypeOf<CurrencyCode>().toEqualTypeOf<'GTQ' | 'BZD' | 'HNL' | 'NIO' | 'CRC' | 'PAB' | 'USD'>();
    expectTypeOf(countryCodes).toEqualTypeOf<readonly ['GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA']>();
  });

  it('narrows untrusted codes once', () => {
    const fromApi: unknown = 'NI';
    if (isCountryCode(fromApi)) expectTypeOf(fromApi).toEqualTypeOf<CountryCode>();
    expectTypeOf(country('NI')).toEqualTypeOf<Country | undefined>();
  });

  it('rejects codes and options that do not exist', () => {
    // @ts-expect-error EUR is not a supported currency
    expectTypeOf(formatMoney).toBeCallableWith('5', 'EUR');
    // @ts-expect-error codes are uppercase
    expectTypeOf(validatePhone).toBeCallableWith('8123 4567', 'ni');
    // @ts-expect-error the type option is any or mobile
    expectTypeOf(validatePhone).toBeCallableWith('8123 4567', 'NI', { type: 'Mobile' });
  });

  it('returns ISO dates from the date parser', () => {
    expectTypeOf(parseDate('24/11/2026')).toEqualTypeOf<IsoDate | null>();
  });

  it('lets an error map cover every phone error', () => {
    const messages = {
      format: '',
      missing_country: '',
      too_short: '',
      too_long: '',
      country: '',
      invalid: '',
      type: '',
    } satisfies Record<PhoneError, string>;
    expectTypeOf(messages).toMatchTypeOf<Record<PhoneError, string>>();
  });
});
