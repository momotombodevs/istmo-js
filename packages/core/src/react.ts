import { useState } from 'react';
import { type Phone, type PhoneError, type PhoneOptions, parsePhone, phoneExample, validatePhone } from './phone';
import { formatPhoneInput } from './phone-input';
import { countries as allCountries, type Country, type CountryCode, countryCodes } from './regions';
import { requireCountry } from './require';

export interface UsePhoneInputOptions extends PhoneOptions {
  /** Country selected at first, and used for numbers typed without `+`. */
  readonly defaultCountry: CountryCode;
  /** A stored number to edit, in E.164 (`+50581234567`). Its country becomes the selected one. */
  readonly initialValue?: string | null;
}

/** State and handlers for a phone field. Wire them to a `TextInput` (React Native) or an `<input>` (web). */
export interface PhoneInput {
  /** Text to show in the field, formatted while typing. */
  readonly value: string;
  /** Selected country. Typing `+` and a calling code selects that country. */
  readonly country: Country;
  /** Countries to offer in the selector, with their flag. */
  readonly countries: readonly Country[];
  /** Example number of the selected country, for the placeholder. */
  readonly placeholder: string;
  /** The valid number, or `null` while the field is empty or invalid. Send `phone.e164`. */
  readonly phone: Phone | null;
  /** Why the number is invalid, shown only after the field lost focus once. `null` when empty or valid. */
  readonly error: PhoneError | null;
  readonly onChangeText: (text: string) => void;
  readonly onBlur: () => void;
  /** Selects a country from {@link PhoneInput.countries}. */
  readonly setCountry: (code: CountryCode) => void;
  /** Goes back to the initial value and hides the error. */
  readonly reset: () => void;
}

interface FieldState {
  readonly text: string;
  readonly country: CountryCode;
  readonly touched: boolean;
}

const digitsOf = (text: string): string => text.replace(/\D/g, '');

function initialState({ defaultCountry, initialValue, countries }: UsePhoneInputOptions): FieldState {
  const stored = initialValue ? parsePhone(initialValue, defaultCountry, { countries }) : null;
  return stored
    ? { text: stored.national, country: stored.country, touched: false }
    : { text: '', country: requireCountry(defaultCountry).code, touched: false };
}

function typedText(previous: string, next: string): string {
  const deletedOnlyFormatting = next.length < previous.length && digitsOf(next) === digitsOf(previous);
  if (!deletedOnlyFormatting) return next;
  let deletedAt = 0;
  while (deletedAt < next.length && next[deletedAt] === previous[deletedAt]) deletedAt++;
  const before = previous.slice(0, deletedAt).replace(/\d(?=\D*$)/, '');
  return before + previous.slice(deletedAt + 1);
}

/**
 * A phone field that formats while typing, follows the country of a number typed with `+`, and validates
 * with the same rules as {@link validatePhone}. It renders nothing: draw the flag selector and the input with
 * your own components.
 *
 * @throws {RangeError} When `defaultCountry` or an option is not valid, or `setCountry` gets a country outside `countries`.
 * @example
 * const field = usePhoneInput({ defaultCountry: 'NI', type: 'mobile' });
 * <TextInput value={field.value} onChangeText={field.onChangeText} onBlur={field.onBlur} placeholder={field.placeholder} />
 */
export function usePhoneInput(options: UsePhoneInputOptions): PhoneInput {
  const [state, setState] = useState(() => initialState(options));
  const allowed = options.countries ?? countryCodes;
  const validation = digitsOf(state.text)
    ? validatePhone(state.text, state.country, { type: options.type, countries: allowed })
    : null;

  return {
    value: state.text,
    country: requireCountry(state.country),
    countries: allCountries.filter(({ code }) => allowed.includes(code)),
    placeholder: phoneExample(state.country).national,
    phone: validation?.valid ? validation.phone : null,
    error: state.touched && validation && !validation.valid ? validation.error : null,
    onChangeText: (next) =>
      setState((current) => {
        const formatted = formatPhoneInput(typedText(current.text, next), current.country);
        const country = formatted.country && allowed.includes(formatted.country) ? formatted.country : current.country;
        return { ...current, text: formatted.text, country };
      }),
    onBlur: () => setState((current) => (current.touched ? current : { ...current, touched: true })),
    setCountry: (code) => {
      if (!allowed.includes(code)) throw new RangeError('País fuera de la lista countries del campo.');
      setState((current) => ({ ...current, country: code, text: formatPhoneInput(current.text, code).text }));
    },
    reset: () => setState(initialState(options)),
  };
}

export { formatPhoneInput, type PhoneInputText } from './phone-input';
