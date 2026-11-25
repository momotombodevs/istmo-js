import {
  type CountryCode as LibCountryCode,
  ParseError,
  type PhoneNumber,
  parsePhoneNumberWithError,
  validatePhoneNumberLength,
} from 'libphonenumber-js/core';
import { metadata } from './metadata';
import examples from './phone-examples.json';
import { type CountryCode, countryCodes, isCountryCode } from './regions';
import { requireCountry } from './require';

/**
 * Kind of line. `fixed_or_mobile` is used where the numbering plan cannot tell them apart.
 * Pager, personal, shared-cost and similar rare kinds are reported as `other`.
 */
export type PhoneType = 'mobile' | 'fixed' | 'fixed_or_mobile' | 'toll_free' | 'premium' | 'voip' | 'other';

/**
 * Why a phone number was rejected.
 *
 * - `format`: not a phone number: no digits, letters, stray punctuation, or an extension.
 * - `missing_country`: a local number without `+` and no `defaultCountry` to read it with.
 * - `too_short` / `too_long`: wrong number of digits for the country.
 * - `country`: the number belongs to a country outside Central America or outside `options.countries`.
 * - `invalid`: right length, but not a number that exists in the country's numbering plan.
 * - `type`: `options.type` is `mobile` and the number is a landline.
 */
export type PhoneError = 'format' | 'missing_country' | 'too_short' | 'too_long' | 'country' | 'invalid' | 'type';

export interface PhoneOptions {
  /** `mobile` accepts only numbers that can receive SMS or WhatsApp (`mobile` or `fixed_or_mobile`). Default `any`. */
  readonly type?: 'any' | 'mobile';
  /** Restricts the accepted countries. Default: all seven. */
  readonly countries?: readonly CountryCode[];
}

/** A valid phone number in every format the UI and the server need. */
export interface Phone {
  readonly country: CountryCode;
  /** Calling code without `+`, e.g. `505`. */
  readonly callingCode: string;
  /** Digits after the calling code, e.g. `81234567`. */
  readonly nationalNumber: string;
  /** E.164, e.g. `+50581234567`. Store and send this one. */
  readonly e164: string;
  /** For display inside the country, e.g. `8123 4567`. */
  readonly national: string;
  /** For display anywhere, e.g. `+505 8123 4567`. */
  readonly international: string;
  readonly type: PhoneType;
}

export type PhoneValidation =
  | { readonly valid: true; readonly phone: Phone }
  | { readonly valid: false; readonly error: PhoneError };

const TYPES: Readonly<Record<string, PhoneType>> = {
  MOBILE: 'mobile',
  FIXED_LINE: 'fixed',
  FIXED_LINE_OR_MOBILE: 'fixed_or_mobile',
  TOLL_FREE: 'toll_free',
  PREMIUM_RATE: 'premium',
  VOIP: 'voip',
};

const MAX_INPUT_LENGTH = 64;
const SEPARATED_DIGITS = /^\+?(?:\d+|\(\+?\d+\))(?:(?: ?[-./] ?| )(?:\d+|\(\+?\d+\)))*$/;

interface Rules {
  readonly region: CountryCode | undefined;
  readonly mobileOnly: boolean;
  readonly allowed: readonly CountryCode[];
}

function readRules(defaultCountry: CountryCode | null | undefined, options: PhoneOptions | null | undefined): Rules {
  const { type = 'any', countries = countryCodes } = options ?? {};
  if (type !== 'any' && type !== 'mobile') throw new RangeError('Opción type inválida: use "any" o "mobile".');
  if (!Array.isArray(countries) || !countries.every(isCountryCode)) {
    throw new RangeError('Opción countries inválida: use códigos de país en mayúsculas, como ["NI", "CR"].');
  }
  return {
    region: defaultCountry ? requireCountry(defaultCountry).code : undefined,
    mobileOnly: type === 'mobile',
    allowed: countries,
  };
}

function fail(error: PhoneError): PhoneValidation {
  return { valid: false, error };
}

function parse(input: string, defaultCountry: CountryCode | undefined): PhoneNumber | PhoneError {
  try {
    return parsePhoneNumberWithError(
      input,
      { defaultCountry: defaultCountry as LibCountryCode | undefined, extract: false },
      metadata,
    );
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
    if (error.message === 'TOO_SHORT') return 'too_short';
    if (error.message === 'TOO_LONG') return 'too_long';
    if (error.message !== 'INVALID_COUNTRY') return 'format';
    return !defaultCountry && !input.trimStart().startsWith('+') ? 'missing_country' : 'country';
  }
}

/**
 * Validates a phone number and tells why it failed. Use it to show a specific error message.
 *
 * @param input What the person typed: groups of digits separated by one space, `-`, `.` or `/`, an optional
 *   leading `+`, and one group in parentheses such as `(+505)`. Any other text is rejected as `format`.
 * @param defaultCountry Country used for numbers typed without `+`, as an exact uppercase code.
 * @throws {RangeError} When `defaultCountry` or an option is not valid. These are programming errors, never caused by the input.
 * @example validatePhone('8123 4567', 'NI') // { valid: true, phone: { e164: '+50581234567', ... } }
 * @example validatePhone('1234', 'NI') // { valid: false, error: 'too_short' }
 */
export function validatePhone(
  input: unknown,
  defaultCountry?: CountryCode | null,
  options?: PhoneOptions | null,
): PhoneValidation {
  const { region, mobileOnly, allowed } = readRules(defaultCountry, options);
  if (typeof input !== 'string' || input.length > MAX_INPUT_LENGTH) return fail('format');
  const text = input.replace(/[\s\u00a0]+/g, ' ').trim();
  if (!SEPARATED_DIGITS.test(text)) return fail('format');

  const parsed = parse(text.replace(/[()]/g, ''), region);
  if (typeof parsed === 'string') return fail(parsed);
  if (!isCountryCode(parsed.country) || !allowed.includes(parsed.country)) return fail('country');

  const length = validatePhoneNumberLength(parsed.number, metadata);
  if (length === 'TOO_SHORT') return fail('too_short');
  if (length === 'TOO_LONG') return fail('too_long');
  if (length !== undefined || !parsed.isValid()) return fail('invalid');

  const type = TYPES[parsed.getType() ?? ''] ?? 'other';
  if (mobileOnly && type !== 'mobile' && type !== 'fixed_or_mobile') return fail('type');

  const national = parsed.formatNational();
  return {
    valid: true,
    phone: {
      country: parsed.country,
      callingCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
      e164: parsed.number,
      national,
      international: `+${parsed.countryCallingCode} ${national}`,
      type,
    },
  };
}

/**
 * Parses a phone number. Same rules as {@link validatePhone}.
 *
 * @returns The number in every format, or `null` when it is not valid.
 * @throws {RangeError} When `defaultCountry` or an option is not valid.
 * @example parsePhone('8123 4567', 'NI')?.e164 // "+50581234567"
 */
export function parsePhone(
  input: unknown,
  defaultCountry?: CountryCode | null,
  options?: PhoneOptions | null,
): Phone | null {
  const result = validatePhone(input, defaultCountry, options);
  return result.valid ? result.phone : null;
}

/**
 * Tells whether a phone number is valid. Same rules as {@link validatePhone}.
 *
 * @throws {RangeError} When `defaultCountry` or an option is not valid.
 * @example isValidPhone('2222 2222', 'NI', { type: 'mobile' }) // false, it is a landline
 */
export function isValidPhone(
  input: unknown,
  defaultCountry?: CountryCode | null,
  options?: PhoneOptions | null,
): boolean {
  return validatePhone(input, defaultCountry, options).valid;
}

/**
 * An example mobile number of a country, for a placeholder.
 *
 * @throws {RangeError} When the country is not supported.
 * @example phoneExample('NI').national // "8123 4567"
 */
export function phoneExample(countryCode: CountryCode): Phone {
  const { code } = requireCountry(countryCode);
  const result = validatePhone(examples[code], code);
  if (!result.valid) throw new RangeError('Falta el número de ejemplo del país.');
  return result.phone;
}
