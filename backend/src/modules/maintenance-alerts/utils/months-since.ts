// Usa componentes UTC, nunca locais (`getFullYear`/`getMonth`) — todo dado de
// data no backend é Instant/UTC (ver TIMEZONE.md), e o worker do job roda
// independente do fuso do processo.
export function monthsSince(reference: Date, now: Date): number {
  let months = (now.getUTCFullYear() - reference.getUTCFullYear()) * 12 + (now.getUTCMonth() - reference.getUTCMonth());

  if (now.getUTCDate() < reference.getUTCDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}
