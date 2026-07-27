const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrencyBRL(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}
