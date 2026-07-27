import { describe, expect, it } from 'vitest';
import { canTransitionServiceOrder } from '../state-machine';

describe('canTransitionServiceOrder', () => {
  it('allows direct operational moves represented by the board', () => {
    expect(canTransitionServiceOrder('OPEN', 'AWAITING_APPROVAL')).toBe(true);
    expect(canTransitionServiceOrder('AWAITING_APPROVAL', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionServiceOrder('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionServiceOrder('IN_PROGRESS', 'WAITING_PARTS')).toBe(true);
    expect(canTransitionServiceOrder('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransitionServiceOrder('WAITING_PARTS', 'IN_PROGRESS')).toBe(true);
  });

  it('rejects skipping or reversing workflow stages', () => {
    expect(canTransitionServiceOrder('OPEN', 'COMPLETED')).toBe(false);
    expect(canTransitionServiceOrder('AWAITING_APPROVAL', 'COMPLETED')).toBe(false);
    expect(canTransitionServiceOrder('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionServiceOrder('WAITING_PARTS', 'COMPLETED')).toBe(false);
  });
});
