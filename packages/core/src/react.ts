import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatDate, formatDateInput, type IsoDate } from './dates';
import { applyEdit, commonPrefix, commonSuffix } from './formatted-input';
import { type Amount, formatMoney, formatMoneyInput, parseMoney, toMinorUnits } from './money';
import {
  isValidPhone,
  type Phone,
  type PhoneError,
  type PhoneOptions,
  parsePhone,
  phoneExample,
  validatePhone,
} from './phone';
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
  /** A stored number to edit, in E.164 (`+50581234567`). Its country becomes the selected one. Ignored when `value` is set. */
  readonly initialValue?: string | null;
  /** Controlled text, for a field whose value lives in a store or a form library. Pass it with `country` and `onChange`. */
  readonly value?: string;
  /** Controlled country, used with `value`. Falls back to `defaultCountry`. */
  readonly country?: CountryCode | null;
  /** Called with the new text and country after every change, controlled or not. */
  readonly onChange?: (change: PhoneInputChange) => void;
}

/** What {@link UsePhoneInputOptions.onChange} receives. */
export interface PhoneInputChange {
  readonly value: string;
  readonly country: CountryCode;
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

interface Interaction {
  readonly touched: boolean;
  readonly caret: number | null;
}

const FRESH: Interaction = { touched: false, caret: null };

/** The part of a web `<input>` or a React Native `TextInput` the hooks use to move the caret. */
export interface SelectableInput {
  setSelectionRange?: (start: number, end: number) => void;
  setSelection?: (start: number, end: number) => void;
}

const DIGIT = /\d/;
const useIsomorphicLayoutEffect = 'window' in globalThis ? useLayoutEffect : useEffect;
const digitsOf = (text: string): string => text.replace(/\D/g, '');

function initialPhone(
  defaultCountry: CountryCode,
  initialValue: string | null | undefined,
  countries: readonly CountryCode[],
): PhoneInputChange {
  const stored = initialValue ? parsePhone(initialValue, defaultCountry, { countries }) : null;
  return stored
    ? { value: stored.national, country: stored.country }
    : { value: '', country: requireCountry(defaultCountry).code };
}

function textForCountry(text: string, country: CountryCode): string {
  if (text.trimStart().startsWith('+')) return text;
  const digits = digitsOf(text);
  return isValidPhone(digits, country) ? formatPhoneInput(digits, country).text : digits;
}

function useFieldValue<T>(
  controlled: T | undefined,
  onChange: ((value: T) => void) | undefined,
  initial: () => T,
): readonly [T, (change: (current: T) => T) => void] {
  const [own, setOwn] = useState(initial);
  const value = controlled === undefined ? own : controlled;
  const latest = useRef({ value, onChange, controlled: controlled !== undefined });
  useIsomorphicLayoutEffect(() => {
    latest.current = { value, onChange, controlled: controlled !== undefined };
  });
  const update = useCallback((change: (current: T) => T) => {
    const current = latest.current;
    const next = change(current.value);
    current.value = next;
    if (!current.controlled) setOwn(next);
    current.onChange?.(next);
  }, []);
  return [value, update];
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
 * The handlers keep the same identity while the options do not change. Pass `value`, `country` and `onChange` to
 * control the field from a store or a form library; otherwise it keeps its own state.
 *
 * @throws {RangeError} When `defaultCountry` or an option is not valid, or `setCountry` gets a country outside `countries`.
 * @example
 * const { ref, value, onChangeText, onBlur, placeholder } = usePhoneInput({ defaultCountry: 'NI', type: 'mobile' });
 * <TextInput ref={ref} value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder={placeholder} />
 */
export function usePhoneInput(options: UsePhoneInputOptions): PhoneInput {
  const { defaultCountry, initialValue, type } = options;
  const allowedKey = (options.countries ?? countryCodes).join(',');
  const controlled =
    options.value === undefined ? undefined : { value: options.value, country: options.country ?? defaultCountry };
  const [field, update] = useFieldValue(controlled, options.onChange, () =>
    initialPhone(defaultCountry, initialValue, options.countries ?? countryCodes),
  );
  const [interaction, setInteraction] = useState(FRESH);
  const ref = useCaret(interaction.caret, field.value);

  const handlers = useMemo(() => {
    const allowed = allowedKey.split(',') as CountryCode[];
    return {
      allowed,
      onChangeText: (next: string) =>
        update((current) => {
          let detected: CountryCode | undefined;
          const edit = applyEdit(
            current.value,
            next,
            (typed) => {
              const formatted = formatPhoneInput(typed, current.country);
              detected = formatted.country;
              return formatted.text;
            },
            DIGIT,
          );
          setInteraction((state) => ({ ...state, caret: edit.caret }));
          return { value: edit.text, country: detected && allowed.includes(detected) ? detected : current.country };
        }),
      onBlur: () => setInteraction((state) => (state.touched ? state : { ...state, touched: true })),
      setCountry: (code: CountryCode) => {
        if (!allowed.includes(code)) throw new RangeError('País fuera de la lista countries del campo.');
        setInteraction((state) => ({ ...state, caret: null }));
        update((current) => ({ value: textForCountry(current.value, code), country: code }));
      },
      reset: () => {
        setInteraction(FRESH);
        update(() => initialPhone(defaultCountry, initialValue, allowed));
      },
    };
  }, [allowedKey, defaultCountry, initialValue, update]);

  const validation = digitsOf(field.value)
    ? validatePhone(field.value, field.country, { type, countries: handlers.allowed })
    : null;

  return {
    ref,
    value: field.value,
    country: requireCountry(field.country),
    countries: allCountries.filter(({ code }) => handlers.allowed.includes(code)),
    placeholder: phoneExample(field.country).national,
    phone: validation?.valid ? validation.phone : null,
    error: interaction.touched && validation && !validation.valid ? validation.error : null,
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
  /** Controlled text shown in the field (`1,250.5`), for a value that lives in a store or a form library. */
  readonly value?: string;
  /** Called with the new text after every change, controlled or not. Read the amount with {@link formatMoneyInput}. */
  readonly onChange?: (value: string) => void;
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

const AMOUNT_CHARACTER = /[\d.]/;

function initialMoney(currency: CurrencyCode, initialValue: Amount | null | undefined): string {
  return initialValue === null || initialValue === undefined
    ? ''
    : formatMoney(initialValue, currency, { display: 'none' });
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
 * const { ref, value, onChangeText, onBlur } = useMoneyInput({ currency: 'NIO', min: '1' });
 * <TextInput ref={ref} value={value} onChangeText={onChangeText} onBlur={onBlur} keyboardType="decimal-pad" />
 */
export function useMoneyInput({ currency, initialValue, min, max, value, onChange }: UseMoneyInputOptions): MoneyInput {
  const target = requireCurrency(currency);
  const [text, update] = useFieldValue(value, onChange, () => initialMoney(currency, initialValue));
  const [interaction, setInteraction] = useState(FRESH);
  const ref = useCaret(interaction.caret, text);

  const handlers = useMemo(
    () => ({
      onChangeText: (next: string) =>
        update((current) => {
          const edit = applyEdit(
            current,
            typedAmount(current, next, currency),
            (typed) => formatMoneyInput(typed, currency).text,
            AMOUNT_CHARACTER,
          );
          setInteraction((state) => ({ ...state, caret: edit.caret }));
          return edit.text;
        }),
      onBlur: () => {
        setInteraction({ touched: true, caret: null });
        update((current) => {
          const { amount } = formatMoneyInput(current, currency);
          return amount === null ? current : formatMoney(amount, currency, { display: 'none' });
        });
      },
      reset: () => {
        setInteraction(FRESH);
        update(() => initialMoney(currency, initialValue));
      },
    }),
    [currency, initialValue, update],
  );

  const { amount } = formatMoneyInput(text, currency);
  const error = amountError(amount, text, currency, min, max);

  return {
    ref,
    value: text,
    amount: error === null ? amount : null,
    error: interaction.touched ? error : null,
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
  /** Controlled text shown in the field (`24/11/2026`), for a value that lives in a store or a form library. */
  readonly value?: string;
  /** Called with the new text after every change, controlled or not. Read the date with {@link formatDateInput}. */
  readonly onChange?: (value: string) => void;
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

function initialDate(initialValue: string | null | undefined): string {
  return initialValue ? formatDate(initialValue) : '';
}

/**
 * A `dd/mm/aaaa` field that adds `/` while typing, keeps the caret where the person is typing, and refuses dates
 * that do not exist or fall outside `min` and `max`. It renders nothing.
 *
 * @throws {RangeError} When `initialValue` is not a valid `YYYY-MM-DD` date.
 * @example
 * const { ref, value, onChangeText, onBlur } = useDateInput({ min: today('NI') });
 * <TextInput ref={ref} value={value} onChangeText={onChangeText} onBlur={onBlur} keyboardType="number-pad" />
 */
export function useDateInput({ initialValue, min, max, value, onChange }: UseDateInputOptions = {}): DateInput {
  const [text, update] = useFieldValue(value, onChange, () => initialDate(initialValue));
  const [interaction, setInteraction] = useState(FRESH);
  const ref = useCaret(interaction.caret, text);

  const handlers = useMemo(
    () => ({
      onChangeText: (next: string) =>
        update((current) => {
          const edit = applyEdit(current, next, (typed) => formatDateInput(typed).text, DATE_DIGIT);
          setInteraction((state) => ({ ...state, caret: edit.caret }));
          return edit.text;
        }),
      onBlur: () => setInteraction((state) => (state.touched ? state : { ...state, touched: true })),
      reset: () => {
        setInteraction(FRESH);
        update(() => initialDate(initialValue));
      },
    }),
    [initialValue, update],
  );

  const { date } = formatDateInput(text);
  const error: DateInputError | null =
    date === null ? (text ? 'format' : null) : min && date < min ? 'min' : max && date > max ? 'max' : null;

  return {
    ref,
    value: text,
    date: error === null ? date : null,
    error: interaction.touched ? error : null,
    placeholder: 'dd/mm/aaaa',
    onChangeText: handlers.onChangeText,
    onBlur: handlers.onBlur,
    reset: handlers.reset,
  };
}

export { type DateInputText, formatDateInput } from './dates';
export { formatMoneyInput, type MoneyInputText } from './money';
export { formatPhoneInput, type PhoneInputText } from './phone-input';
