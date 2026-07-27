import type { FinancialEntryType } from '@oficina/contracts';

type DefaultCategory = { name: string; type: FinancialEntryType; group: string; color: string; isSystem: true };
const build = (type: FinancialEntryType, group: string, color: string, names: string[]): DefaultCategory[] =>
  names.map((name) => ({ name, type, group, color, isSystem: true }));

export const DEFAULT_FINANCIAL_CATEGORIES: DefaultCategory[] = [
  ...build('INCOME', 'Serviços', '#2563EB', ['Mão de obra', 'Diagnóstico técnico', 'Revisão preventiva', 'Serviços elétricos', 'Alinhamento e balanceamento']),
  ...build('INCOME', 'Vendas', '#059669', ['Venda de peças', 'Venda de pneus', 'Venda de acessórios']),
  ...build('INCOME', 'Outras receitas', '#0D9488', ['Serviços terceirizados repassados', 'Contratos e atendimento de frotas', 'Guincho e transporte', 'Outras receitas']),
  ...build('EXPENSE', 'Custos variáveis', '#DC2626', ['Compra de peças', 'Compra de pneus', 'Materiais e consumíveis', 'Óleos, fluidos e lubrificantes', 'Serviços terceirizados', 'Comissões', 'Taxas de cartão', 'Fretes', 'Garantias e retrabalho', 'Estornos e devoluções']),
  ...build('EXPENSE', 'Despesas fixas', '#EA580C', ['Folha de pagamento', 'Pró-labore', 'Aluguel', 'Energia elétrica', 'Água', 'Telefone e internet', 'Sistemas e assinaturas', 'Contabilidade', 'Seguros', 'Segurança e monitoramento', 'Limpeza', 'Marketing e publicidade']),
  ...build('EXPENSE', 'Operação e estrutura', '#7C3AED', ['Ferramentas', 'Equipamentos', 'Manutenção de equipamentos', 'Manutenção predial', 'EPIs e uniformes', 'Combustível', 'Veículos da empresa', 'Treinamentos', 'Licenças e certificações']),
  ...build('EXPENSE', 'Financeiro e tributário', '#B45309', ['Impostos sobre vendas', 'Impostos e taxas municipais', 'Tarifas bancárias', 'Juros e multas', 'Empréstimos e financiamentos', 'Investimentos e imobilizado', 'Outras despesas']),
];
