import { type Currency, currency as findCurrency } from './regions';

export type MoneyDisplay = 'symbol' | 'code' | 'none';

export interface FormatMoneyOptions {
  readonly display?: MoneyDisplay;
  readonly decimals?: 'always' | 'auto';
}

interface Decimal {
  readonly negative: boolean;
  readonly integer: string;
  readonly fraction: string;
}

const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

function requireCurrency(code: string): Currency {
  const found = findCurrency(code);
  if (!found) throw new RangeError(`Moneda no soportada: ${code}`);
  return found;
}

function toDecimal(amount: string | number): Decimal {
  const text = typeof amount === 'number' ? String(amount) : amount.trim();
  const match = DECIMAL.exec(text);
  if (!match || (typeof amount === 'number' && !Number.isFinite(amount))) {
    throw new RangeError(`Monto inválido: ${String(amount)}`);
  }
  return { negative: match[1] === '-', integer: match[2] ?? '0', fraction: match[3] ?? '' };
}

function round({ negative, integer, fraction }: Decimal, decimals: number): Decimal {
  const kept = fraction.padEnd(decimals, '0').slice(0, decimals);
  const digits = BigInt(`${integer}${kept}`) + (Number(fraction[decimals] ?? '0') >= 5 ? 1n : 0n);
  const text = digits.toString().padStart(decimals + 1, '0');
  const rounded = {
    integer: text.slice(0, text.length - decimals),
    fraction: decimals > 0 ? text.slice(-decimals) : '',
  };
  return { negative: negative && digits !== 0n, ...rounded };
}

function group(integer: string, separator: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatMoney(amount: string | number, currencyCode: string, options: FormatMoneyOptions = {}): string {
  const target = requireCurrency(currencyCode);
  const { negative, integer, fraction } = round(toDecimal(amount), target.decimals);
  const hideFraction = options.decimals === 'auto' && /^0*$/.test(fraction);
  const number = `${group(integer, target.groupSeparator)}${hideFraction || !fraction ? '' : target.decimalSeparator + fraction}`;
  const display = options.display ?? 'symbol';
  const prefix = display === 'none' ? '' : `${display === 'code' ? target.code : target.symbol} `;
  return `${negative ? '-' : ''}${prefix}${number}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function parseMoney(input: string, currencyCode: string): string | null {
  const target = requireCurrency(currencyCode);
  let text = input.trim();
  for (const label of [target.code, target.symbol]) {
    const prefix = new RegExp(`^${escapeRegExp(label)}\\s*`, 'i');
    if (prefix.test(text)) {
      text = text.replace(prefix, '');
      break;
    }
  }

  const spaceGroup = /\s/.test(target.groupSeparator);
  const group = spaceGroup ? '[\\s\\u00a0]' : escapeRegExp(target.groupSeparator);
  const decimal = spaceGroup ? `[${escapeRegExp(target.decimalSeparator)}.]` : escapeRegExp(target.decimalSeparator);
  const pattern = new RegExp(`^(\\d{1,3}(?:${group}\\d{3})+|\\d+)(?:${decimal}(\\d+))?$`);
  const match = pattern.exec(text);
  if (!match) return null;

  const integer = (match[1] ?? '').replace(/\D/g, '');
  const fraction = match[2] ?? '';
  if (fraction.length > target.decimals) return null;

  const normalized = BigInt(integer).toString();
  return target.decimals > 0 ? `${normalized}.${fraction.padEnd(target.decimals, '0')}` : normalized;
}

export function toMinorUnits(amount: string | number, currencyCode: string): number {
  const target = requireCurrency(currencyCode);
  const { negative, integer, fraction } = round(toDecimal(amount), target.decimals);
  const minor = Number(`${integer}${fraction}`);
  if (!Number.isSafeInteger(minor)) throw new RangeError(`Monto demasiado grande: ${String(amount)}`);
  return negative ? -minor : minor;
}

export function fromMinorUnits(minor: number, currencyCode: string): string {
  const target = requireCurrency(currencyCode);
  if (!Number.isSafeInteger(minor)) throw new RangeError(`Unidades menores inválidas: ${minor}`);
  const digits = Math.abs(minor)
    .toString()
    .padStart(target.decimals + 1, '0');
  const integer = digits.slice(0, digits.length - target.decimals);
  const fraction = target.decimals > 0 ? `.${digits.slice(-target.decimals)}` : '';
  return `${minor < 0 ? '-' : ''}${integer}${fraction}`;
}
