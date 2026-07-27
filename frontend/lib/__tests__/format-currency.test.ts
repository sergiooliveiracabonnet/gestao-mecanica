import { describe, expect, it } from 'vitest';
import { formatCurrencyBRL } from '../format-currency';

describe('formatCurrencyBRL', () => {
  it('formats zero cents', () => {
    expect(formatCurrencyBRL(0)).toBe('R$ 0,00');
  });

  it('formats whole reais', () => {
    expect(formatCurrencyBRL(10000)).toBe('R$ 100,00');
  });

  it('formats cents that are not a round number', () => {
    expect(formatCurrencyBRL(12345)).toBe('R$ 123,45');
  });

  it('formats large values with thousand separators', () => {
    expect(formatCurrencyBRL(123456789)).toBe('R$ 1.234.567,89');
  });

  it('does not throw on a negative value', () => {
    expect(formatCurrencyBRL(-500)).toBe('-R$ 5,00');
  });
});
