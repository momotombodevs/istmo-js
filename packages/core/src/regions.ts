import data from './regions.json';

/** ISO 3166-1 alpha-2 code of a supported Central American country. */
export type CountryCode = 'GT' | 'BZ' | 'SV' | 'HN' | 'NI' | 'CR' | 'PA';

/** ISO 4217 code of a supported currency. */
export type CurrencyCode = 'GTQ' | 'BZD' | 'HNL' | 'NIO' | 'CRC' | 'PAB' | 'USD';

/** UTC offset written as `±HH:MM`, e.g. `-06:00`. */
export type UtcOffset = `${'+' | '-'}${number}:${number}`;

/** A supported country and its defaults. */
export interface Country {
  readonly code: CountryCode;
  /** Name in Spanish, e.g. `Panamá`. */
  readonly name: string;
  /** Calling code without `+`, e.g. `505`. */
  readonly callingCode: string;
  /** Main currency used for prices. */
  readonly currency: CurrencyCode;
  /** Every currency the country accepts, main one first. */
  readonly currencies: readonly CurrencyCode[];
  /** IANA time zone, e.g. `America/Managua`. */
  readonly timezone: string;
  /** Fixed UTC offset. None of the supported countries observes daylight saving time. */
  readonly utcOffset: UtcOffset;
}

/** A supported currency and how it is written. */
export interface Currency {
  readonly code: CurrencyCode;
  /** Name in Spanish, e.g. `Córdoba`. */
  readonly name: string;
  /** Symbol shown before the amount, e.g. `C$`. */
  readonly symbol: string;
  /** Number of decimal places. */
  readonly decimals: number;
  readonly decimalSeparator: string;
  readonly groupSeparator: string;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Every supported country, frozen. */
export const countries: readonly Country[] = deepFreeze(data.countries as Country[]);

/** Every supported currency, frozen. */
export const currencies: readonly Currency[] = deepFreeze(data.currencies as Currency[]);

/** Codes of every supported country, in the same order as {@link countries}. */
export const countryCodes: readonly CountryCode[] = Object.freeze(countries.map(({ code }) => code));

/** Codes of every supported currency, in the same order as {@link currencies}. */
export const currencyCodes: readonly CurrencyCode[] = Object.freeze(currencies.map(({ code }) => code));

function normalize(code: unknown): string {
  return typeof code === 'string' ? code.toUpperCase() : '';
}

/**
 * Finds a country by code. Case-insensitive; surrounding spaces are not removed.
 *
 * @example country('NI')?.callingCode // "505"
 */
export function country(code: CountryCode): Country | undefined {
  const wanted = normalize(code);
  return countries.find((entry) => entry.code === wanted);
}

/**
 * Finds a currency by code. Case-insensitive; surrounding spaces are not removed.
 *
 * @example currency('CRC')?.symbol // "₡"
 */
export function currency(code: CurrencyCode): Currency | undefined {
  const wanted = normalize(code);
  return currencies.find((entry) => entry.code === wanted);
}

/**
 * Narrows an untrusted value, such as an API field, to a {@link CountryCode}. Only exact uppercase codes pass.
 *
 * @example isCountryCode('NI') // true
 * @example isCountryCode('ni') // false
 */
export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (countryCodes as readonly string[]).includes(value);
}

/**
 * Narrows an untrusted value, such as an API field, to a {@link CurrencyCode}. Only exact uppercase codes pass.
 *
 * @example isCurrencyCode('NIO') // true
 * @example isCurrencyCode('EUR') // false
 */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (currencyCodes as readonly string[]).includes(value);
}

/**
 * Tells whether a country accepts a currency.
 *
 * @example acceptsCurrency('NI', 'USD') // true
 * @example acceptsCurrency('NI', 'GTQ') // false
 */
export function acceptsCurrency(countryCode: CountryCode, currencyCode: CurrencyCode): boolean {
  const target = currency(currencyCode);
  return target !== undefined && (country(countryCode)?.currencies.includes(target.code) ?? false);
}

export function requireCountry(code: CountryCode): Country {
  const found = country(code);
  if (!found) throw new RangeError('País no soportado.');
  return found;
}

export function requireCurrency(code: CurrencyCode): Currency {
  const found = currency(code);
  if (!found) throw new RangeError('Moneda no soportada.');
  return found;
}
