import {
  type CountryCode as LibCountryCode,
  ParseError,
  type PhoneNumber,
  parsePhoneNumberWithError,
  validatePhoneNumberLength,
} from 'libphonenumber-js/max';
import { type CountryCode, countryCodes, isCountryCode } from './regions';

export type PhoneType = 'mobile' | 'fixed' | 'fixed_or_mobile' | 'toll_free' | 'premium' | 'voip' | 'other';

export type PhoneError = 'format' | 'too_short' | 'too_long' | 'country' | 'invalid' | 'type';

export interface PhoneOptions {
  readonly type?: 'any' | 'mobile';
  readonly countries?: readonly CountryCode[];
}

export interface Phone {
  readonly country: CountryCode;
  readonly callingCode: string;
  readonly nationalNumber: string;
  readonly e164: string;
  readonly national: string;
  readonly international: string;
  readonly type: PhoneType;
}

export type PhoneValidation =
  | { readonly valid: true; readonly phone: Phone }
  | { readonly valid: false; readonly error: PhoneError };

const TYPES: Record<string, PhoneType> = {
  MOBILE: 'mobile',
  FIXED_LINE: 'fixed',
  FIXED_LINE_OR_MOBILE: 'fixed_or_mobile',
  TOLL_FREE: 'toll_free',
  PREMIUM_RATE: 'premium',
  VOIP: 'voip',
};

const PARSE_ERRORS: Record<string, PhoneError> = {
  INVALID_COUNTRY: 'country',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
};

function fail(error: PhoneError): PhoneValidation {
  return { valid: false, error };
}

function parse(input: string, defaultCountry: string | null | undefined): PhoneNumber | PhoneError {
  if (defaultCountry && !isCountryCode(defaultCountry)) {
    throw new RangeError(`País no soportado: ${defaultCountry}`);
  }
  if (!/\d/.test(input)) return 'format';
  try {
    return parsePhoneNumberWithError(input, (defaultCountry || undefined) as LibCountryCode | undefined);
  } catch (error) {
    if (error instanceof ParseError) return PARSE_ERRORS[error.message] ?? 'format';
    throw error;
  }
}

export function validatePhone(
  input: string,
  defaultCountry?: CountryCode | null,
  options: PhoneOptions = {},
): PhoneValidation {
  const parsed = parse(input, defaultCountry);
  if (typeof parsed === 'string') return fail(parsed);

  const allowed = options.countries ?? countryCodes;
  const region = parsed.country;
  if (!region || !allowed.includes(region as CountryCode)) return fail('country');

  const length = validatePhoneNumberLength(parsed.number);
  if (length === 'TOO_SHORT') return fail('too_short');
  if (length === 'TOO_LONG') return fail('too_long');
  if (length !== undefined || !parsed.isValid()) return fail('invalid');

  const type = TYPES[parsed.getType() ?? ''] ?? 'other';
  if (options.type === 'mobile' && type !== 'mobile' && type !== 'fixed_or_mobile') return fail('type');

  return {
    valid: true,
    phone: {
      country: region as CountryCode,
      callingCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
      e164: parsed.number,
      national: parsed.formatNational(),
      international: `+${parsed.countryCallingCode} ${parsed.formatNational()}`,
      type,
    },
  };
}

export function parsePhone(input: string, defaultCountry?: CountryCode | null, options?: PhoneOptions): Phone | null {
  const result = validatePhone(input, defaultCountry, options);
  return result.valid ? result.phone : null;
}

export function isValidPhone(input: string, defaultCountry?: CountryCode | null, options?: PhoneOptions): boolean {
  return validatePhone(input, defaultCountry, options).valid;
}
