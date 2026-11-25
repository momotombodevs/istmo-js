import { type Country, type CountryCode, type Currency, type CurrencyCode, country, currency } from './regions';

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
