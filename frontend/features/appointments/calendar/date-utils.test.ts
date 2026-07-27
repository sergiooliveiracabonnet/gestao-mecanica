import { describe, expect, it } from 'vitest';
import { addDays, startOfWeek } from './date-utils';

describe('appointment date utils', () => {
  it('inicia a semana na segunda-feira', () => {
    expect(startOfWeek(new Date(2026, 6, 29)).getDay()).toBe(1);
  });

  it('soma dias sem alterar a data original', () => {
    const date = new Date(2026, 6, 27);
    expect(addDays(date, 2).getDate()).toBe(29);
    expect(date.getDate()).toBe(27);
  });
});
