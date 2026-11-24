import { type Country, country as findCountry } from './regions';

export interface LocalDateTime {
  readonly date: string;
  readonly time: string;
  readonly iso: string;
}

const LOCAL_DATE = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})$/;

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function requireCountry(code: string): Country {
  const found = findCountry(code);
  if (!found) throw new RangeError(`País no soportado: ${code}`);
  return found;
}

function offsetMinutes({ utcOffset }: Country): number {
  const sign = utcOffset.startsWith('-') ? -1 : 1;
  const [hours = 0, minutes = 0] = utcOffset.slice(1).split(':').map(Number);
  return sign * (hours * 60 + minutes);
}

function requireIsoDate(date: string): [number, number, number] {
  const match = ISO_DATE.exec(date);
  const parts: [number, number, number] = [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
  if (!match || isoDate(...parts) === null) throw new RangeError(`Fecha inválida: ${date}`);
  return parts;
}

export function parseDate(input: string): string | null {
  const match = LOCAL_DATE.exec(input.trim());
  if (!match) return null;
  return isoDate(Number(match[4]), Number(match[3]), Number(match[1]));
}

export function isValidDate(input: string): boolean {
  return parseDate(input) !== null;
}

export function formatDate(date: string): string {
  const [year, month, day] = requireIsoDate(date);
  return `${pad(day)}/${pad(month)}/${pad(year, 4)}`;
}

export function localDateTime(countryCode: string, instant: Date | string = new Date()): LocalDateTime {
  const target = requireCountry(countryCode);
  const time = typeof instant === 'string' ? Date.parse(instant) : instant.getTime();
  if (Number.isNaN(time)) throw new RangeError(`Instante inválido: ${String(instant)}`);

  const local = new Date(time + offsetMinutes(target) * 60_000);
  const date = `${pad(local.getUTCFullYear(), 4)}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const clock = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  return { date, time: clock, iso: `${date}T${clock}:${pad(local.getUTCSeconds())}${target.utcOffset}` };
}

export function today(countryCode: string, instant?: Date | string): string {
  return localDateTime(countryCode, instant).date;
}

export function zonedDateTime(date: string, time: string, countryCode: string): string {
  const target = requireCountry(countryCode);
  requireIsoDate(date);
  const match = TIME.exec(time.trim());
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (!match || hours > 23 || minutes > 59) throw new RangeError(`Hora inválida: ${time}`);
  return `${date}T${pad(hours)}:${pad(minutes)}:00${target.utcOffset}`;
}
