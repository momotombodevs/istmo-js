import data from './regions.json';

export type CountryCode = 'GT' | 'BZ' | 'SV' | 'HN' | 'NI' | 'CR' | 'PA';

export type CurrencyCode = 'GTQ' | 'BZD' | 'HNL' | 'NIO' | 'CRC' | 'PAB' | 'USD';

export interface Country {
  readonly code: CountryCode;
  readonly name: string;
  readonly callingCode: string;
  readonly currency: CurrencyCode;
  readonly currencies: readonly CurrencyCode[];
  readonly timezone: string;
  readonly utcOffset: string;
}

export interface Currency {
  readonly code: CurrencyCode;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly decimalSeparator: string;
  readonly groupSeparator: string;
}

export const countries: readonly Country[] = data.countries as readonly Country[];

export const currencies: readonly Currency[] = data.currencies as readonly Currency[];

export const countryCodes: readonly CountryCode[] = countries.map(({ code }) => code);

export function country(code: string): Country | undefined {
  const upper = code.trim().toUpperCase();
  return countries.find((entry) => entry.code === upper);
}

export function currency(code: string): Currency | undefined {
  const upper = code.trim().toUpperCase();
  return currencies.find((entry) => entry.code === upper);
}

export function isCountryCode(code: string): code is CountryCode {
  return country(code) !== undefined && code === code.toUpperCase();
}

export function isCurrencyCode(code: string, countryCode?: string): boolean {
  const found = currency(code);
  if (!found) return false;
  if (countryCode === undefined) return true;
  return country(countryCode)?.currencies.includes(found.code) ?? false;
}
