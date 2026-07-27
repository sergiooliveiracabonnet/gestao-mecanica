import { canTransitionAppointment } from './appointment-state-machine';

describe('appointment state machine', () => {
  it('permite o fluxo normal até a conclusão', () => {
    expect(canTransitionAppointment('SCHEDULED', 'CONFIRMED')).toBe(true);
    expect(canTransitionAppointment('CONFIRMED', 'IN_SERVICE')).toBe(true);
    expect(canTransitionAppointment('IN_SERVICE', 'COMPLETED')).toBe(true);
  });

  it('não permite reabrir estados finais', () => {
    expect(canTransitionAppointment('COMPLETED', 'SCHEDULED')).toBe(false);
    expect(canTransitionAppointment('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionAppointment('NO_SHOW', 'CONFIRMED')).toBe(false);
  });
});
