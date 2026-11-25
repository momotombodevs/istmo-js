import { type Currency, type CurrencyCode, requireCurrency } from './regions';

/** How {@link formatMoney} labels the amount. */
export type MoneyDisplay = 'symbol' | 'code' | 'none';

export interface FormatMoneyOptions {
  /** `symbol` (default) shows `C$`, `code` shows `NIO`, `none` shows only the number. */
  readonly display?: MoneyDisplay;
  /** `always` (default) keeps every decimal; `auto` drops them when they are all zero (`C$ 180`). */
  readonly decimals?: 'always' | 'auto';
}

/** An amount as decimal text with `.` as separator, such as `"1250.50"`, or a safe JavaScript number. */
export type Amount = string | number;

/** Longest integer part accepted, in digits. Large enough for any `decimal` database column. */
export const MAX_INTEGER_DIGITS = 30;

const MAX_INPUT_LENGTH = 64;
const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;
const NBSP = ' ';

interface Decimal {
  readonly negative: boolean;
  readonly integer: string;
  readonly fraction: string;
}

function toDecimal(amount: Amount): Decimal {
  if (typeof amount === 'number' && (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Monto inválido: use un texto decimal para montos fuera del rango seguro de number.');
  }
  const text = typeof amount === 'number' ? String(amount) : typeof amount === 'string' ? amount.trim() : '';
  const match = DECIMAL.exec(text);
  if (!match || (match[2] ?? '').replace(/^0+(?=\d)/, '').length > MAX_INTEGER_DIGITS) {
    throw new RangeError('Monto inválido: se espera un decimal como "1250.50".');
  }
  return { negative: match[1] === '-', integer: match[2] ?? '0', fraction: match[3] ?? '' };
}

function increment(digits: string): string {
  let result = '';
  let carry = 1;
  for (let index = digits.length - 1; index >= 0; index--) {
    const sum = Number(digits[index]) + carry;
    result = String(sum % 10) + result;
    carry = sum > 9 ? 1 : 0;
  }
  return carry ? `1${result}` : result;
}

function round({ negative, integer, fraction }: Decimal, decimals: number): Decimal {
  const kept = `${integer}${fraction.padEnd(decimals, '0').slice(0, decimals)}`;
  const rounded = Number(fraction[decimals] ?? '0') >= 5 ? increment(kept) : kept;
  const digits = rounded.replace(/^0+(?=\d)/, '').padStart(decimals + 1, '0');
  const result = {
    integer: digits.slice(0, digits.length - decimals),
    fraction: decimals > 0 ? digits.slice(-decimals) : '',
  };
  return { negative: negative && /[1-9]/.test(digits), ...result };
}

function group(integer: string, separator: string): string {
  const head = integer.length % 3 || 3;
  const parts = [integer.slice(0, head)];
  for (let index = head; index < integer.length; index += 3) parts.push(integer.slice(index, index + 3));
  return parts.join(separator);
}

/**
 * Formats an amount for display. Rounds half away from zero on the decimal text, so `1.005` gives `1.01`.
 * The label and the number are joined with a non-breaking space so they never wrap apart.
 *
 * @param amount Decimal text with `.` (`"1250.5"`, as stored in a `decimal` column) or a safe number.
 * @throws {RangeError} When the currency is not supported or the amount is not a decimal.
 * @example formatMoney('1250.5', 'NIO') // "C$ 1,250.50"
 * @example formatMoney('1234567.5', 'CRC') // "₡ 1 234 567,50"
 * @example formatMoney('180', 'NIO', { decimals: 'auto' }) // "C$ 180"
 */
export function formatMoney(amount: Amount, currencyCode: CurrencyCode, options: FormatMoneyOptions = {}): string {
  const target = requireCurrency(currencyCode);
  const { negative, integer, fraction } = round(toDecimal(amount), target.decimals);
  const hideFraction = options.decimals === 'auto' && !/[1-9]/.test(fraction);
  const number = `${group(integer, target.groupSeparator)}${hideFraction || !fraction ? '' : target.decimalSeparator + fraction}`;
  const display = options.display ?? 'symbol';
  const label = display === 'none' ? '' : `${display === 'code' ? target.code : target.symbol}${NBSP}`;
  return `${negative ? '-' : ''}${label}${number}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function amountPattern(target: Currency): RegExp {
  const spaceGroup = /\s/.test(target.groupSeparator);
  const groupSeparator = spaceGroup ? '[\\s\\u00a0]' : escapeRegExp(target.groupSeparator);
  const decimalSeparator = spaceGroup
    ? `[${escapeRegExp(target.decimalSeparator)}.]`
    : escapeRegExp(target.decimalSeparator);
  return new RegExp(`^(\\d{1,3}(?:${groupSeparator}\\d{3})+|\\d+)(?:${decimalSeparator}(\\d+))?$`);
}

/**
 * Reads an amount typed by a person and returns it as decimal text with exactly the currency's decimals,
 * ready to send to the server. Accepts an optional symbol or code of that currency (any case), the
 * currency's group and decimal separators, and for currencies grouped with spaces (CRC) also `.` as decimal.
 * Negative amounts are rejected.
 *
 * @returns The normalized amount, or `null` when the text is not a valid amount in that currency.
 * @throws {RangeError} When the currency is not supported.
 * @example parseMoney('C$ 1,250.50', 'NIO') // "1250.50"
 * @example parseMoney('12.345', 'NIO') // null, too many decimals
 * @example parseMoney('$20', 'NIO') // null, symbol of another currency
 */
export function parseMoney(input: unknown, currencyCode: CurrencyCode): string | null {
  const target = requireCurrency(currencyCode);
  if (typeof input !== 'string' || input.length > MAX_INPUT_LENGTH) return null;

  let text = input.trim();
  for (const label of [target.code, target.symbol]) {
    const prefix = new RegExp(`^${escapeRegExp(label)}[\\s\\u00a0]*`, 'i');
    if (prefix.test(text)) {
      text = text.replace(prefix, '');
      break;
    }
  }

  const match = amountPattern(target).exec(text);
  if (!match) return null;

  const integer = (match[1] ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const fraction = match[2] ?? '';
  if (fraction.length > target.decimals || integer.length > MAX_INTEGER_DIGITS) return null;

  return target.decimals > 0 ? `${integer}.${fraction.padEnd(target.decimals, '0')}` : integer;
}

/**
 * Converts an amount to an integer count of the currency's minor unit (cents), rounding like {@link formatMoney}.
 *
 * @throws {RangeError} When the currency is not supported, the amount is not a decimal, or the result is not a safe integer.
 * @example toMinorUnits('12.34', 'USD') // 1234
 */
export function toMinorUnits(amount: Amount, currencyCode: CurrencyCode): number {
  const target = requireCurrency(currencyCode);
  const { negative, integer, fraction } = round(toDecimal(amount), target.decimals);
  const minor = Number(`${integer}${fraction}`);
  if (!Number.isSafeInteger(minor)) throw new RangeError('Monto demasiado grande para unidades menores.');
  return negative ? -minor : minor;
}

/**
 * Converts an integer count of minor units back to decimal text.
 *
 * @throws {RangeError} When the currency is not supported or `minor` is not a safe integer.
 * @example fromMinorUnits(1234, 'USD') // "12.34"
 */
export function fromMinorUnits(minor: number, currencyCode: CurrencyCode): string {
  const target = requireCurrency(currencyCode);
  if (!Number.isSafeInteger(minor)) throw new RangeError('Las unidades menores tienen que ser un entero seguro.');
  const digits = Math.abs(minor)
    .toString()
    .padStart(target.decimals + 1, '0');
  const integer = digits.slice(0, digits.length - target.decimals);
  const fraction = target.decimals > 0 ? `.${digits.slice(-target.decimals)}` : '';
  return `${minor < 0 ? '-' : ''}${integer}${fraction}`;
}
