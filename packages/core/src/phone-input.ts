import { AsYouType, type CountryCode as LibCountryCode } from 'libphonenumber-js/core';
import { metadata } from './metadata';
import { type CountryCode, isCountryCode } from './regions';
import { requireCountry } from './require';

/** What {@link formatPhoneInput} returns. */
export interface PhoneInputText {
  /** The text to show in the field, formatted as far as it can be, e.g. `8123 45`. */
  readonly text: string;
  /** Country the number belongs to once its calling code is typed (`+506…`), otherwise `undefined`. */
  readonly country: CountryCode | undefined;
}

const MAX_TYPED_DIGITS = 20;

/**
 * Formats a phone number while it is being typed, for the value of a text field. Keeps only digits and a
 * leading `+`, so pasted text such as `(+506) 8312-3456` becomes `+506 8312 3456`.
 *
 * @param defaultCountry Country used for numbers typed without `+`.
 * @throws {RangeError} When `defaultCountry` is not one of the seven supported countries.
 * @example formatPhoneInput('812345', 'NI') // { text: '8123 45', country: undefined }
 * @example formatPhoneInput('+50683123456', 'NI') // { text: '+506 8312 3456', country: 'CR' }
 */
export function formatPhoneInput(text: unknown, defaultCountry: CountryCode): PhoneInputText {
  const region = requireCountry(defaultCountry).code;
  const typed = typeof text === 'string' ? text : '';
  const digits = typed.replace(/\D/g, '').slice(0, MAX_TYPED_DIGITS);
  const international = /^[\s(]*\+/.test(typed);
  if (!digits) return { text: international ? '+' : '', country: undefined };

  const formatter = new AsYouType(region as LibCountryCode, metadata);
  const formatted = formatter.input(international ? `+${digits}` : digits);
  const detected = international ? formatter.getCountry() : undefined;
  return { text: formatted, country: isCountryCode(detected) ? detected : undefined };
}
