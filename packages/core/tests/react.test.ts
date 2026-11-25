import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePhoneInput } from '../src/react';

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
