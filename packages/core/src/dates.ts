import type { Country, CountryCode } from './regions';
import { requireCountry } from './require';

/** A calendar date written as `YYYY-MM-DD`, as returned by {@link parseDate} and {@link today}. The type only hints the shape. */
export type IsoDate = `${number}-${number}-${number}`;

/**
 * A moment in time: a `Date`, milliseconds since the epoch, or ISO 8601 text with uppercase `T` and `Z` or an
 * offset (`2026-11-24T20:30:00Z`, `2026-11-24T14:30:00-06:00`). The text is read by this library, not by
 * `Date.parse`, so every engine gives the same result. Text without an offset, or with a date or time that does
 * not exist, is rejected.
 */
export type Instant = Date | number | string;

/** Date and time on the wall clock of a country. */
export interface LocalDateTime {
  /** `YYYY-MM-DD`. */
  readonly date: IsoDate;
  /** `HH:MM`, 24-hour clock. */
  readonly time: string;
  /** ISO 8601 with the country's offset, e.g. `2026-11-24T22:30:00-06:00`. */
  readonly iso: string;
}

const LOCAL_DATE = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const TIME = /^(\d{1,2}):(\d{2})$/;

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function toIsoDate(year: number, month: number, day: number): IsoDate | null {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (lengths[month - 1] ?? 0)
  )
    return null;
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}` as IsoDate;
}

function offsetMinutes({ utcOffset }: Country): number {
  const sign = utcOffset.startsWith('-') ? -1 : 1;
  const [hours = 0, minutes = 0] = utcOffset.slice(1).split(':').map(Number);
  return sign * (hours * 60 + minutes);
}

function requireIsoDate(date: string): void {
  const match = typeof date === 'string' ? ISO_DATE.exec(date) : null;
  if (!match || toIsoDate(Number(match[1]), Number(match[2]), Number(match[3])) === null) {
    throw new RangeError('Fecha inválida: se espera YYYY-MM-DD.');
  }
}

function utcEpoch(year: number, month: number, day: number, minutes: number, milliseconds: number): number {
  const moment = new Date(0);
  moment.setUTCFullYear(year, month - 1, day);
  return moment.getTime() + minutes * 60_000 + milliseconds;
}

function invalidInstant(): RangeError {
  return new RangeError('Instante inválido: use ISO 8601 con Z o con desfase, como 2026-11-24T20:30:00Z.');
}

const toNumber = (part: string | undefined): number => Number(part ?? 0);

function parseInstant(text: string): number {
  const match = ISO_INSTANT.exec(text.trim());
  if (!match) throw invalidInstant();
  const [year, month, day, hours, minutes, seconds, fraction = '', sign, offsetHours, offsetMinutes] = match.slice(1);
  const date = { year: toNumber(year), month: toNumber(month), day: toNumber(day) };
  const time = { hours: toNumber(hours), minutes: toNumber(minutes), seconds: toNumber(seconds) };
  const offset = { hours: toNumber(offsetHours), minutes: toNumber(offsetMinutes) };
  if (
    toIsoDate(date.year, date.month, date.day) === null ||
    time.hours > 23 ||
    time.minutes > 59 ||
    time.seconds > 59 ||
    offset.hours > 23 ||
    offset.minutes > 59
  ) {
    throw invalidInstant();
  }
  const offsetMinutesTotal = (sign === '-' ? -1 : 1) * (offset.hours * 60 + offset.minutes);
  const milliseconds = time.seconds * 1000 + Number(fraction.padEnd(3, '0').slice(0, 3));
  return utcEpoch(date.year, date.month, date.day, time.hours * 60 + time.minutes - offsetMinutesTotal, milliseconds);
}

function toEpoch(instant: Instant): number {
  const time =
    typeof instant === 'string' ? parseInstant(instant) : typeof instant === 'number' ? instant : instant.getTime();
  if (!Number.isFinite(time)) throw new RangeError('Instante inválido.');
  return time;
}

/**
 * Reads a date written `dd/mm/aaaa` (also `d/m/aaaa` and `dd-mm-aaaa`) and rejects dates that do not exist.
 *
 * @returns The date as `YYYY-MM-DD`, or `null` when it is not a valid date.
 * @example parseDate('24/11/2026') // "2026-11-24"
 * @example parseDate('29/02/2026') // null
 */
export function parseDate(input: unknown): IsoDate | null {
  if (typeof input !== 'string') return null;
  const match = LOCAL_DATE.exec(input.trim());
  if (!match) return null;
  return toIsoDate(Number(match[4]), Number(match[3]), Number(match[1]));
}

/**
 * Tells whether a text is a valid `dd/mm/aaaa` date. Same rules as {@link parseDate}.
 *
 * @example isValidDate('31/04/2026') // false
 */
export function isValidDate(input: unknown): boolean {
  return parseDate(input) !== null;
}

/**
 * Writes a `YYYY-MM-DD` date as `dd/mm/aaaa`.
 *
 * @throws {RangeError} When the date is not a valid `YYYY-MM-DD` date.
 * @example formatDate('2026-11-24') // "24/11/2026"
 */
export function formatDate(date: string): string {
  requireIsoDate(date);
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Date and time on the wall clock of a country, whatever the device or server time zone is.
 *
 * @param instant The moment to read. Default: now.
 * @throws {RangeError} When the country is not supported or the instant is not valid.
 * @example localDateTime('NI', '2026-11-25T04:30:00Z') // { date: '2026-11-24', time: '22:30', iso: '2026-11-24T22:30:00-06:00' }
 */
export function localDateTime(countryCode: CountryCode, instant: Instant = Date.now()): LocalDateTime {
  const target = requireCountry(countryCode);
  const local = new Date(toEpoch(instant) + offsetMinutes(target) * 60_000);
  const date = toIsoDate(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
  if (date === null) throw new RangeError('Instante fuera del rango de fechas soportado.');
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  return { date, time, iso: `${date}T${time}:${pad(local.getUTCSeconds())}${target.utcOffset}` };
}

/**
 * Today's date in a country, whatever the device or server time zone is.
 *
 * @param instant The moment to read. Default: now.
 * @throws {RangeError} When the country is not supported or the instant is not valid.
 * @example today('NI') // "2026-11-24"
 */
export function today(countryCode: CountryCode, instant?: Instant): IsoDate {
  return localDateTime(countryCode, instant).date;
}

/**
 * The moment a wall-clock date and time happen in a country, as ISO 8601 with the country's offset.
 * Use it to send a chosen date and time (a reservation, a delivery slot) to the server.
 *
 * @param time `HH:MM` or `H:MM`, 24-hour clock.
 * @throws {RangeError} When the date, the time or the country is not valid.
 * @example zonedDateTime('2026-11-24', '14:30', 'NI') // "2026-11-24T14:30:00-06:00"
 */
export function zonedDateTime(date: string, time: string, countryCode: CountryCode): string {
  const target = requireCountry(countryCode);
  requireIsoDate(date);
  const match = typeof time === 'string' ? TIME.exec(time.trim()) : null;
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (!match || hours > 23 || minutes > 59) throw new RangeError('Hora inválida: se espera HH:MM.');
  return `${date}T${pad(hours)}:${pad(minutes)}:00${target.utcOffset}`;
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
const TIME_TEXT = /^(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?\s*m\.?)?$/i;
const DAY_MS = 86_400_000;

function dateParts(date: string): { year: number; month: number; day: number } {
  requireIsoDate(date);
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  return { year, month, day };
}

function dayNumber(date: string): number {
  const { year, month, day } = dateParts(date);
  return Math.round(utcEpoch(year, month, day, 0, 0) / DAY_MS);
}

/**
 * Reads a time as people write it: `14:30`, `2:30 pm`, `2:30 p. m.`, `2 pm`, `12 am`.
 *
 * @returns The time as `HH:MM` on a 24-hour clock, or `null` when it is not a valid time.
 * @example parseTime('2:30 p. m.') // "14:30"
 * @example parseTime('12 am') // "00:00"
 * @example parseTime('25:00') // null
 */
export function parseTime(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const match = TIME_TEXT.exec(input.trim());
  if (!match) return null;
  const meridiem = match[3]?.toLowerCase();
  const minutes = Number(match[2] ?? 0);
  let hours = Number(match[1]);
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'p' ? 12 : 0);
  } else if (hours > 23 || match[2] === undefined) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * Writes a `HH:MM` time the way it is read in the region: `2:30 p. m.`, or `14:30` with `clock: '24h'`.
 *
 * @throws {RangeError} When the time is not a valid `HH:MM` time.
 * @example formatTime('14:30') // "2:30 p. m."
 * @example formatTime('00:05') // "12:05 a. m."
 * @example formatTime('14:30', { clock: '24h' }) // "14:30"
 */
export function formatTime(time: string, options: { readonly clock?: '12h' | '24h' } = {}): string {
  const match = typeof time === 'string' ? /^(\d{2}):(\d{2})$/.exec(time) : null;
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (!match || hours > 23 || minutes > 59) throw new RangeError('Hora inválida: se espera HH:MM.');
  if (options.clock === '24h') return time;
  return `${hours % 12 || 12}:${pad(minutes)} ${hours < 12 ? 'a. m.' : 'p. m.'}`;
}

/**
 * Writes a `YYYY-MM-DD` date in words, in Spanish.
 *
 * @throws {RangeError} When the date is not a valid `YYYY-MM-DD` date.
 * @example formatLongDate('2026-11-24') // "martes 24 de noviembre de 2026"
 * @example formatLongDate('2026-11-24', { weekday: false, year: false }) // "24 de noviembre"
 */
export function formatLongDate(
  date: string,
  options: { readonly weekday?: boolean; readonly year?: boolean } = {},
): string {
  const { year, month, day } = dateParts(date);
  const weekday = WEEKDAYS[new Date(utcEpoch(year, month, day, 0, 0)).getUTCDay()];
  const text = `${day} de ${MONTHS[month - 1]}${options.year === false ? '' : ` de ${year}`}`;
  return options.weekday === false ? text : `${weekday} ${text}`;
}

/**
 * Days from one `YYYY-MM-DD` date to another; negative when `to` is earlier.
 *
 * @throws {RangeError} When a date is not a valid `YYYY-MM-DD` date.
 * @example daysBetween('2026-11-24', '2026-12-25') // 31
 */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/**
 * Completed years between a birth date and another date, such as {@link today}.
 *
 * @throws {RangeError} When a date is not valid or `onDate` is before `birthDate`.
 * @example ageOn('2008-11-25', '2026-11-24') // 17
 * @example ageOn('2008-11-24', '2026-11-24') // 18
 */
export function ageOn(birthDate: string, onDate: string): number {
  const birth = dateParts(birthDate);
  const on = dateParts(onDate);
  if (onDate < birthDate) throw new RangeError('La fecha es anterior al nacimiento.');
  const birthdayPassed = on.month > birth.month || (on.month === birth.month && on.day >= birth.day);
  return on.year - birth.year - (birthdayPassed ? 0 : 1);
}

/** What {@link formatDateInput} returns. */
export interface DateInputText {
  /** The text to show in the field, with `/` added while typing, e.g. `24/11`. */
  readonly text: string;
  /** The date as `YYYY-MM-DD` once it is complete and exists, otherwise `null`. */
  readonly date: IsoDate | null;
}

/**
 * Formats a `dd/mm/aaaa` date while it is being typed: adds `/` after the day and the month, and pads a one-digit
 * day or month when the person types the `/` themselves (`1/` becomes `01/`).
 *
 * @example formatDateInput('2411') // { text: '24/11', date: null }
 * @example formatDateInput('24112026') // { text: '24/11/2026', date: '2026-11-24' }
 * @example formatDateInput('1/2/2026') // { text: '01/02/2026', date: '2026-02-01' }
 */
export function formatDateInput(text: unknown): DateInputText {
  const typed = typeof text === 'string' ? text.slice(0, 32) : '';
  const fields = ['', '', ''];
  const limits = [2, 2, 4];
  let field = 0;
  let closedBySeparator = false;
  for (const character of typed) {
    if (/\d/.test(character)) {
      if (field < 2 && fields[field]?.length === limits[field]) field++;
      if ((fields[field]?.length ?? 0) < (limits[field] ?? 0)) fields[field] += character;
      closedBySeparator = false;
    } else if (/[/.-]/.test(character) && field < 2 && fields[field]) {
      fields[field] = (fields[field] ?? '').padStart(2, '0');
      field++;
      closedBySeparator = true;
    }
  }
  const shown = fields.filter(Boolean).join('/') + (closedBySeparator ? '/' : '');
  return { text: shown, date: fields[2]?.length === 4 ? parseDate(shown) : null };
}
