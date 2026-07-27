import { monthsSince } from './months-since';

describe('monthsSince', () => {
  it('returns 6 for exactly 6 months apart on the same day of month', () => {
    const reference = new Date('2026-01-15T10:00:00.000Z');
    const now = new Date('2026-07-15T10:00:00.000Z');

    expect(monthsSince(reference, now)).toBe(6);
  });

  it('returns 5 when one day short of completing the 6th month', () => {
    const reference = new Date('2026-01-15T10:00:00.000Z');
    const now = new Date('2026-07-14T10:00:00.000Z');

    expect(monthsSince(reference, now)).toBe(5);
  });

  it('counts correctly across a year rollover', () => {
    const reference = new Date('2025-11-01T00:00:00.000Z');
    const now = new Date('2026-02-01T00:00:00.000Z');

    expect(monthsSince(reference, now)).toBe(3);
  });

  it('does not count the current month as complete when the day of month has not been reached yet', () => {
    const reference = new Date('2026-01-20T00:00:00.000Z');
    const now = new Date('2026-07-10T00:00:00.000Z');

    expect(monthsSince(reference, now)).toBe(5);
  });

  it('returns 0 for the same instant', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');

    expect(monthsSince(now, now)).toBe(0);
  });

  it('never returns a negative number when now is before the reference (clock skew)', () => {
    const reference = new Date('2026-07-26T00:00:00.000Z');
    const now = new Date('2026-06-01T00:00:00.000Z');

    expect(monthsSince(reference, now)).toBe(0);
  });
});
