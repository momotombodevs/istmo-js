import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createElement, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { type PhoneInputChange, useDateInput, useMoneyInput, usePhoneInput } from '../src/react';

afterEach(cleanup);

function type(field: { current: { onChangeText: (text: string) => void } }, ...steps: string[]) {
  for (const text of steps) act(() => field.current.onChangeText(text));
}

describe('usePhoneInput', () => {
  it('formats while typing and gives the number to send', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI' }));
    expect(result.current.placeholder).toBe('8123 4567');
    expect(result.current.country.flag).toBe('🇳🇮');

    type(result, '8', '81', '812', '8123', '81234');
    expect(result.current.value).toBe('8123 4');
    expect(result.current.phone).toBeNull();

    type(result, '8123 45', '8123 456', '8123 4567');
    expect(result.current.value).toBe('8123 4567');
    expect(result.current.phone?.e164).toBe('+50581234567');
    expect(result.current.error).toBeNull();
  });

  it('deletes the digit before a space that backspace removed', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI' }));
    type(result, '81234567');
    expect(result.current.value).toBe('8123 4567');
    type(result, '81234567');
    expect(result.current.value).toBe('8124 567');
  });

  it('deletes the last digit with backspace at the end', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI' }));
    type(result, '81234');
    type(result, '8123 ');
    expect(result.current.value).toBe('8123');
    type(result, '812');
    expect(result.current.value).toBe('812');
  });

  it('follows the country of a number typed with +', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI' }));
    type(result, '(+506) 8312-3456');
    expect(result.current.value).toBe('+506 8312 3456');
    expect(result.current.country.code).toBe('CR');
    expect(result.current.phone?.e164).toBe('+50683123456');
  });

  it('keeps the selected country when the typed one is not allowed', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI', countries: ['NI'] }));
    type(result, '+506 8312 3456');
    expect(result.current.country.code).toBe('NI');
    act(() => result.current.onBlur());
    expect(result.current.error).toBe('country');
  });

  it('shows the error only after the field loses focus', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI', type: 'mobile' }));
    type(result, '2222 2222');
    expect(result.current.error).toBeNull();
    expect(result.current.phone).toBeNull();
    act(() => result.current.onBlur());
    expect(result.current.error).toBe('type');
    type(result, '');
    expect(result.current.error).toBeNull();
  });

  it('changes the country from the selector', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI', countries: ['NI', 'PA'] }));
    expect(result.current.countries.map(({ code }) => code)).toEqual(['NI', 'PA']);
    type(result, '61234567');
    act(() => result.current.setCountry('PA'));
    expect(result.current.value).toBe('6123-4567');
    expect(result.current.placeholder).toBe('6123-4567');
    expect(result.current.phone?.e164).toBe('+50761234567');
    expect(() => result.current.setCountry('CR')).toThrow(RangeError);
  });

  it('edits a stored number and resets to it', () => {
    const { result } = renderHook(() => usePhoneInput({ defaultCountry: 'NI', initialValue: '+50683123456' }));
    expect(result.current.value).toBe('8312 3456');
    expect(result.current.country.code).toBe('CR');
    type(result, '8312');
    act(() => result.current.onBlur());
    act(() => result.current.reset());
    expect(result.current.value).toBe('8312 3456');
    expect(result.current.error).toBeNull();
  });

  it('refuses options that do not exist', () => {
    expect(() => renderHook(() => usePhoneInput({ defaultCountry: 'MX' as 'NI' }))).toThrow(RangeError);
  });
});

function PhoneInputField() {
  const field = usePhoneInput({ defaultCountry: 'NI' });
  return createElement('input', {
    ref: field.ref,
    value: field.value,
    onChange: (event: { target: { value: string } }) => field.onChangeText(event.target.value),
    'aria-label': 'phone',
  });
}

describe('usePhoneInput caret', () => {
  function setup(value: string) {
    render(createElement(PhoneInputField));
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
    return input;
  }

  it.each([
    ['inserts a digit in the middle', '8123 45', '81923 45', '8192 345', 3],
    ['deletes a digit in the middle', '8123 4567', '813 4567', '8134 567', 2],
    ['deletes the space before the cursor', '8123 4567', '81234567', '8124 567', 3],
    ['pastes in the middle', '8123', '81555523', '8155 5523', 7],
  ])('%s', (_, start, typed, shown, caret) => {
    const input = setup(start);
    fireEvent.change(input, { target: { value: typed } });
    expect(input.value).toBe(shown);
    expect(input.selectionStart).toBe(caret);
  });

  it('leaves the caret at the end while typing at the end', () => {
    const input = setup('8123');
    fireEvent.change(input, { target: { value: '81234' } });
    expect(input.value).toBe('8123 4');
    expect(input.selectionStart).toBe(6);
  });

  it('keeps the same handlers between renders', () => {
    const { result, rerender } = renderHook(() => usePhoneInput({ defaultCountry: 'NI', countries: ['NI', 'CR'] }));
    const first = result.current;
    rerender();
    act(() => result.current.onChangeText('8'));
    expect(result.current.onChangeText).toBe(first.onChangeText);
    expect(result.current.setCountry).toBe(first.setCountry);
    expect(result.current.ref).toBe(first.ref);
  });
});

function MoneyInputField() {
  const price = useMoneyInput({ currency: 'NIO' });
  return createElement('input', {
    ref: price.ref,
    value: price.value,
    onChange: (event: { target: { value: string } }) => price.onChangeText(event.target.value),
    'aria-label': 'price',
  });
}

describe('useMoneyInput', () => {
  it('groups thousands while typing and completes decimals on blur', () => {
    const { result } = renderHook(() => useMoneyInput({ currency: 'NIO' }));
    expect(result.current.currency.symbol).toBe('C$');
    type(result, '1', '12', '125', '1250', '1,2505');
    expect(result.current.value).toBe('12,505');
    type(result, '12,505.', '12,505.5');
    expect(result.current.value).toBe('12,505.5');
    expect(result.current.amount).toBe('12505.50');
    act(() => result.current.onBlur());
    expect(result.current.value).toBe('12,505.50');
  });

  it('takes a comma from a Spanish decimal keypad as the decimal point', () => {
    const { result } = renderHook(() => useMoneyInput({ currency: 'NIO' }));
    type(result, '1250', '1,250,');
    expect(result.current.value).toBe('1,250.');
    type(result, '1,250.5');
    expect(result.current.amount).toBe('1250.50');
  });

  it('reads a pasted amount in any of the region formats', () => {
    const { result } = renderHook(() => useMoneyInput({ currency: 'CRC' }));
    type(result, '₡1.234,5');
    expect(result.current.value).toBe('1,234.50');
    expect(result.current.amount).toBe('1234.50');
  });

  it('checks the limits after blur', () => {
    const { result } = renderHook(() => useMoneyInput({ currency: 'USD', min: '1', max: '500' }));
    type(result, '0.5');
    expect(result.current.error).toBeNull();
    act(() => result.current.onBlur());
    expect(result.current.error).toBe('min');
    expect(result.current.amount).toBeNull();
    type(result, '600');
    expect(result.current.error).toBe('max');
    type(result, '50');
    expect(result.current.error).toBeNull();
    expect(result.current.amount).toBe('50.00');
  });

  it('edits a stored amount and resets to it', () => {
    const { result } = renderHook(() => useMoneyInput({ currency: 'NIO', initialValue: '1250.5' }));
    expect(result.current.value).toBe('1,250.50');
    type(result, '1,250.5');
    act(() => result.current.reset());
    expect(result.current.value).toBe('1,250.50');
  });

  it.each([
    ['inserts a digit in the middle', '1,234', '1,2934', '12,934', 4],
    ['deletes the comma before the cursor', '1,234', '1234', '234', 0],
    ['deletes a digit in the middle', '12,345', '12,45', '1,245', 3],
  ])('%s keeps the caret', (_, start, typed, shown, caret) => {
    render(createElement(MoneyInputField));
    const input = screen.getByLabelText('price') as HTMLInputElement;
    fireEvent.change(input, { target: { value: start } });
    fireEvent.change(input, { target: { value: typed } });
    expect(input.value).toBe(shown);
    expect(input.selectionStart).toBe(caret);
  });
});

describe('useDateInput', () => {
  it('adds slashes while typing and gives the ISO date', () => {
    const { result } = renderHook(() => useDateInput());
    expect(result.current.placeholder).toBe('dd/mm/aaaa');
    type(result, '2', '24', '241', '24/11', '24/112', '24/11/2026');
    expect(result.current.value).toBe('24/11/2026');
    expect(result.current.date).toBe('2026-11-24');
  });

  it('refuses dates that do not exist or fall outside the limits, after blur', () => {
    const { result } = renderHook(() => useDateInput({ min: '2026-11-24', max: '2026-12-31' }));
    type(result, '31022026');
    expect(result.current.error).toBeNull();
    act(() => result.current.onBlur());
    expect(result.current.error).toBe('format');
    type(result, '23112026');
    expect(result.current.error).toBe('min');
    expect(result.current.date).toBeNull();
    type(result, '01012027');
    expect(result.current.error).toBe('max');
    type(result, '25122026');
    expect(result.current.error).toBeNull();
    expect(result.current.date).toBe('2026-12-25');
  });

  it('edits a stored date and resets to it', () => {
    const { result } = renderHook(() => useDateInput({ initialValue: '2026-02-01' }));
    expect(result.current.value).toBe('01/02/2026');
    type(result, '01/02/20');
    act(() => result.current.reset());
    expect(result.current.value).toBe('01/02/2026');
  });
});

function ControlledPhone({ onStore }: { onStore: (change: PhoneInputChange) => void }) {
  const [stored, setStored] = useState<PhoneInputChange>({ value: '', country: 'NI' });
  const field = usePhoneInput({
    defaultCountry: 'NI',
    value: stored.value,
    country: stored.country,
    onChange: (change) => {
      setStored(change);
      onStore(change);
    },
  });
  return createElement(
    'div',
    null,
    createElement('input', {
      ref: field.ref,
      value: field.value,
      onChange: (event: { target: { value: string } }) => field.onChangeText(event.target.value),
      'aria-label': 'phone',
    }),
    createElement('button', { onClick: () => field.setCountry('CR'), type: 'button' }, 'CR'),
    createElement('button', { onClick: () => setStored({ value: '', country: 'NI' }), type: 'button' }, 'clear'),
    createElement('output', null, field.phone?.e164 ?? ''),
  );
}

describe('controlled hooks', () => {
  it('lets a store own the phone and keeps the caret in place', () => {
    const changes: PhoneInputChange[] = [];
    render(createElement(ControlledPhone, { onStore: (change) => changes.push(change) }));
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '81234567' } });
    expect(input.value).toBe('8123 4567');
    expect(changes.at(-1)).toEqual({ value: '8123 4567', country: 'NI' });
    fireEvent.change(input, { target: { value: '81234567' } });
    expect(input.value).toBe('8124 567');
    expect(input.selectionStart).toBe(3);
  });

  it('follows a value the store changes from outside', () => {
    render(createElement(ControlledPhone, { onStore: () => {} }));
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '81234567' } });
    expect(screen.getByRole('status').textContent).toBe('+50581234567');
    fireEvent.click(screen.getByText('clear'));
    expect(input.value).toBe('');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('reports a country chosen in the selector', () => {
    const changes: PhoneInputChange[] = [];
    render(createElement(ControlledPhone, { onStore: (change) => changes.push(change) }));
    fireEvent.change(screen.getByLabelText('phone'), { target: { value: '83123456' } });
    fireEvent.click(screen.getByText('CR'));
    expect(changes.at(-1)).toEqual({ value: '8312 3456', country: 'CR' });
    expect(screen.getByRole('status').textContent).toBe('+50683123456');
  });

  it('keeps the same handlers while the controlled value changes', () => {
    let value = '';
    const { result, rerender } = renderHook(() =>
      usePhoneInput({ defaultCountry: 'NI', value, onChange: (change) => (value = change.value) }),
    );
    const first = result.current.onChangeText;
    act(() => result.current.onChangeText('8123'));
    rerender();
    expect(result.current.value).toBe('8123');
    expect(result.current.onChangeText).toBe(first);
  });

  it('controls the amount and the date the same way', () => {
    let amount = '';
    let date = '';
    const money = renderHook(() =>
      useMoneyInput({ currency: 'NIO', value: amount, onChange: (next) => (amount = next) }),
    );
    act(() => money.result.current.onChangeText('1250'));
    money.rerender();
    expect(money.result.current.value).toBe('1,250');
    act(() => money.result.current.onBlur());
    money.rerender();
    expect(amount).toBe('1,250.00');

    const day = renderHook(() => useDateInput({ value: date, onChange: (next) => (date = next) }));
    act(() => day.result.current.onChangeText('24112026'));
    day.rerender();
    expect(day.result.current.value).toBe('24/11/2026');
    expect(day.result.current.date).toBe('2026-11-24');
  });

  it('reports changes in uncontrolled mode too', () => {
    const changes: string[] = [];
    const { result } = renderHook(() => useMoneyInput({ currency: 'USD', onChange: (next) => changes.push(next) }));
    act(() => result.current.onChangeText('5'));
    expect(result.current.value).toBe('5');
    expect(changes).toEqual(['5']);
  });
});
