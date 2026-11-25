import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatDate, formatDateInput, type IsoDate } from './dates';
import { applyEdit, commonPrefix, commonSuffix } from './formatted-input';
import { type Amount, formatMoney, formatMoneyInput, parseMoney, toMinorUnits } from './money';
import { type Phone, type PhoneError, type PhoneOptions, parsePhone, phoneExample, validatePhone } from './phone';
import { formatPhoneInput } from './phone-input';
import {
  countries as allCountries,
  type Country,
  type CountryCode,
  type Currency,
  type CurrencyCode,
  countryCodes,
} from './regions';
import { requireCountry, requireCurrency } from './require';

export interface UsePhoneInputOptions extends PhoneOptions {
  /** Country selected at first, and used for numbers typed without `+`. */
  readonly defaultCountry: CountryCode;
  /** A stored number to edit, in E.164 (`+50581234567`). Its country becomes the selected one. */
  readonly initialValue?: string | null;
}

/** State and handlers for a phone field. Wire them to a `TextInput` (React Native) or an `<input>` (web). */
export interface PhoneInput {
  /** Pass to the input's `ref` so the caret stays where the person is typing after each formatting change. */
  readonly ref: (element: SelectableInput | null) => void;
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
  readonly caret: number | null;
}

/** The part of a web `<input>` or a React Native `TextInput` the hooks use to move the caret. */
export interface SelectableInput {
  setSelectionRange?: (start: number, end: number) => void;
  setSelection?: (start: number, end: number) => void;
}

const DIGIT = /\d/;
const useIsomorphicLayoutEffect = 'window' in globalThis ? useLayoutEffect : useEffect;
const digitsOf = (text: string): string => text.replace(/\D/g, '');

function initialState({ defaultCountry, initialValue, countries }: UsePhoneInputOptions): FieldState {
  const stored = initialValue ? parsePhone(initialValue, defaultCountry, { countries }) : null;
  return stored
    ? { text: stored.national, country: stored.country, touched: false, caret: null }
    : { text: '', country: requireCountry(defaultCountry).code, touched: false, caret: null };
}

function useCaret(caret: number | null, text: string): (element: SelectableInput | null) => void {
  const element = useRef<SelectableInput | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (caret === null || caret >= text.length) return;
    element.current?.setSelectionRange?.(caret, caret);
    element.current?.setSelection?.(caret, caret);
  }, [caret, text]);
  return useCallback((input: SelectableInput | null) => {
    element.current = input;
  }, []);
}

/**
 * A phone field that formats while typing, keeps the caret where the person is typing, follows the country of a
 * number typed with `+`, and validates with the same rules as {@link validatePhone}. It renders nothing: draw the
 * flag selector and the input with your own components, and pass `ref` to the input so the caret stays in place.
 * The handlers keep the same identity while the options do not change.
 *
 * @throws {RangeError} When `defaultCountry` or an option is not valid, or `setCountry` gets a country outside `countries`.
 * @example
 * const field = usePhoneInput({ defaultCountry: 'NI', type: 'mobile' });
 * <TextInput ref={field.ref} value={field.value} onChangeText={field.onChangeText} onBlur={field.onBlur} placeholder={field.placeholder} />
 */
export function usePhoneInput(options: UsePhoneInputOptions): PhoneInput {
  const { defaultCountry, initialValue, type } = options;
  const allowedKey = (options.countries ?? countryCodes).join(',');
  const [state, setState] = useState(() => initialState(options));
  const ref = useCaret(state.caret, state.text);

  const handlers = useMemo(() => {
    const allowed = allowedKey.split(',') as CountryCode[];
    const initial = () => initialState({ defaultCountry, initialValue, countries: allowed });
    return {
      allowed,
      onChangeText: (next: string) =>
        setState((current) => {
          let detected: CountryCode | undefined;
          const edit = applyEdit(
            current.text,
            next,
            (typed) => {
              const formatted = formatPhoneInput(typed, current.country);
              detected = formatted.country;
              return formatted.text;
            },
            DIGIT,
          );
          const country = detected && allowed.includes(detected) ? detected : current.country;
          return { ...current, text: edit.text, caret: edit.caret, country };
        }),
      onBlur: () => setState((current) => (current.touched ? current : { ...current, touched: true })),
      setCountry: (code: CountryCode) => {
        if (!allowed.includes(code)) throw new RangeError('País fuera de la lista countries del campo.');
        setState((current) => ({
          ...current,
          country: code,
          text: formatPhoneInput(current.text, code).text,
          caret: null,
        }));
      },
      reset: () => setState(initial()),
    };
  }, [allowedKey, defaultCountry, initialValue]);

  const validation = digitsOf(state.text)
    ? validatePhone(state.text, state.country, { type, countries: handlers.allowed })
    : null;

  return {
    ref,
    value: state.text,
    country: requireCountry(state.country),
    countries: allCountries.filter(({ code }) => handlers.allowed.includes(code)),
    placeholder: phoneExample(state.country).national,
    phone: validation?.valid ? validation.phone : null,
    error: state.touched && validation && !validation.valid ? validation.error : null,
    onChangeText: handlers.onChangeText,
    onBlur: handlers.onBlur,
    setCountry: handlers.setCountry,
    reset: handlers.reset,
  };
}

/** Why an amount in {@link useMoneyInput} is not accepted. */
export type MoneyInputError = 'format' | 'min' | 'max';

export interface UseMoneyInputOptions {
  readonly currency: CurrencyCode;
  /** A stored amount to edit, as decimal text (`"1250.5"`) or a number. */
  readonly initialValue?: Amount | null;
  /** Smallest accepted amount, inclusive. */
  readonly min?: Amount;
  /** Largest accepted amount, inclusive. */
  readonly max?: Amount;
}

/** State and handlers for an amount field. Wire them like {@link PhoneInput}. */
export interface MoneyInput {
  /** Pass to the input's `ref` so the caret stays where the person is typing. */
  readonly ref: (element: SelectableInput | null) => void;
  /** Text to show in the field, grouped while typing (`1,250.5`) and completed on blur (`1,250.50`). */
  readonly value: string;
  /** The amount as decimal text with every decimal of the currency, ready to send, or `null` while empty or not accepted. */
  readonly amount: string | null;
  /** Why the amount is not accepted, shown only after the field lost focus once. `null` when empty or accepted. */
  readonly error: MoneyInputError | null;
  /** The currency, with its `symbol` to show next to the field. */
  readonly currency: Currency;
  readonly onChangeText: (text: string) => void;
  readonly onBlur: () => void;
  /** Goes back to the initial value and hides the error. */
  readonly reset: () => void;
}

interface FieldText {
  readonly text: string;
  readonly touched: boolean;
  readonly caret: number | null;
}

const AMOUNT_CHARACTER = /[\d.]/;

function initialMoney(currency: CurrencyCode, initialValue: Amount | null | undefined): FieldText {
  const text =
    initialValue === null || initialValue === undefined ? '' : formatMoney(initialValue, currency, { display: 'none' });
  return { text, touched: false, caret: null };
}

const FIELD_FORMAT = /^[\d,]*(?:\.\d*)?$/;

function typedAmount(previous: string, next: string, currency: CurrencyCode): string {
  const prefix = commonPrefix(previous, next);
  const suffix = commonSuffix(previous, next, prefix);
  if (next.slice(prefix, next.length - suffix) === ',') {
    return `${next.slice(0, prefix)}.${next.slice(next.length - suffix)}`;
  }
  return FIELD_FORMAT.test(next) ? next : (parseMoney(next, currency) ?? next);
}

function amountError(amount: string | null, text: string, currency: CurrencyCode, min?: Amount, max?: Amount) {
  if (amount === null) return text ? 'format' : null;
  const minor = toMinorUnits(amount, currency);
  if (min !== undefined && minor < toMinorUnits(min, currency)) return 'min';
  if (max !== undefined && minor > toMinorUnits(max, currency)) return 'max';
  return null;
}

/**
 * An amount field that groups thousands while typing, keeps the caret where the person is typing, takes `,` from
 * a Spanish decimal keypad as the decimal point, reads pasted amounts in any of the region's formats, and completes
 * the decimals on blur. It renders nothing: show `currency.symbol` and the input with your own components.
 *
 * @throws {RangeError} When the currency is not supported or `initialValue`, `min` or `max` is not an amount.
 * @example
 * const price = useMoneyInput({ currency: 'NIO', min: '1' });
 * <TextInput ref={price.ref} value={price.value} onChangeText={price.onChangeText} onBlur={price.onBlur} keyboardType="decimal-pad" />
 */
export function useMoneyInput({ currency, initialValue, min, max }: UseMoneyInputOptions): MoneyInput {
  const target = requireCurrency(currency);
  const [state, setState] = useState(() => initialMoney(currency, initialValue));
  const ref = useCaret(state.caret, state.text);

  const handlers = useMemo(
    () => ({
      onChangeText: (next: string) =>
        setState((current) => {
          const edit = applyEdit(
            current.text,
            typedAmount(current.text, next, currency),
            (typed) => formatMoneyInput(typed, currency).text,
            AMOUNT_CHARACTER,
          );
          return { ...current, text: edit.text, caret: edit.caret };
        }),
      onBlur: () =>
        setState((current) => {
          const { amount } = formatMoneyInput(current.text, currency);
          const text = amount === null ? current.text : formatMoney(amount, currency, { display: 'none' });
          return { text, touched: true, caret: null };
        }),
      reset: () => setState(initialMoney(currency, initialValue)),
    }),
    [currency, initialValue],
  );

  const { amount } = formatMoneyInput(state.text, currency);
  const error = amountError(amount, state.text, currency, min, max);

  return {
    ref,
    value: state.text,
    amount: error === null ? amount : null,
    error: state.touched ? error : null,
    currency: target,
    onChangeText: handlers.onChangeText,
    onBlur: handlers.onBlur,
    reset: handlers.reset,
  };
}

/** Why a date in {@link useDateInput} is not accepted. */
export type DateInputError = 'format' | 'min' | 'max';

export interface UseDateInputOptions {
  /** A stored date to edit, as `YYYY-MM-DD`. */
  readonly initialValue?: string | null;
  /** Earliest accepted date, inclusive, as `YYYY-MM-DD`; for example {@link today} to refuse past dates. */
  readonly min?: string;
  /** Latest accepted date, inclusive, as `YYYY-MM-DD`. */
  readonly max?: string;
}

/** State and handlers for a `dd/mm/aaaa` field. Wire them like {@link PhoneInput}. */
export interface DateInput {
  /** Pass to the input's `ref` so the caret stays where the person is typing. */
  readonly ref: (element: SelectableInput | null) => void;
  /** Text to show in the field, with `/` added while typing. */
  readonly value: string;
  /** The date as `YYYY-MM-DD`, ready to send, or `null` while empty, incomplete or not accepted. */
  readonly date: IsoDate | null;
  /** Why the date is not accepted, shown only after the field lost focus once. `null` when empty or accepted. */
  readonly error: DateInputError | null;
  /** `dd/mm/aaaa`, for the placeholder. */
  readonly placeholder: string;
  readonly onChangeText: (text: string) => void;
  readonly onBlur: () => void;
  /** Goes back to the initial value and hides the error. */
  readonly reset: () => void;
}

const DATE_DIGIT = /\d/;

function initialDate(initialValue: string | null | undefined): FieldText {
  return { text: initialValue ? formatDate(initialValue) : '', touched: false, caret: null };
}

/**
 * A `dd/mm/aaaa` field that adds `/` while typing, keeps the caret where the person is typing, and refuses dates
 * that do not exist or fall outside `min` and `max`. It renders nothing.
 *
 * @throws {RangeError} When `initialValue` is not a valid `YYYY-MM-DD` date.
 * @example
 * const delivery = useDateInput({ min: today('NI') });
 * <TextInput ref={delivery.ref} value={delivery.value} onChangeText={delivery.onChangeText} onBlur={delivery.onBlur} keyboardType="number-pad" />
 */
export function useDateInput({ initialValue, min, max }: UseDateInputOptions = {}): DateInput {
  const [state, setState] = useState(() => initialDate(initialValue));
  const ref = useCaret(state.caret, state.text);

  const handlers = useMemo(
    () => ({
      onChangeText: (next: string) =>
        setState((current) => {
          const edit = applyEdit(current.text, next, (typed) => formatDateInput(typed).text, DATE_DIGIT);
          return { ...current, text: edit.text, caret: edit.caret };
        }),
      onBlur: () => setState((current) => (current.touched ? current : { ...current, touched: true })),
      reset: () => setState(initialDate(initialValue)),
    }),
    [initialValue],
  );

  const { date } = formatDateInput(state.text);
  const error: DateInputError | null =
    date === null ? (state.text ? 'format' : null) : min && date < min ? 'min' : max && date > max ? 'max' : null;

  return {
    ref,
    value: state.text,
    date: error === null ? date : null,
    error: state.touched ? error : null,
    placeholder: 'dd/mm/aaaa',
    onChangeText: handlers.onChangeText,
    onBlur: handlers.onBlur,
    reset: handlers.reset,
  };
}

export { type DateInputText, formatDateInput } from './dates';
export { formatMoneyInput, type MoneyInputText } from './money';
export { formatPhoneInput, type PhoneInputText } from './phone-input';
