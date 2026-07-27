ALTER TABLE financial_categories
ADD COLUMN "group" TEXT NOT NULL DEFAULT 'Personalizadas';

WITH defaults(name, type, "group", color) AS (
  VALUES
    ('Mão de obra', 'INCOME', 'Serviços', '#2563EB'),
    ('Diagnóstico técnico', 'INCOME', 'Serviços', '#2563EB'),
    ('Revisão preventiva', 'INCOME', 'Serviços', '#2563EB'),
    ('Serviços elétricos', 'INCOME', 'Serviços', '#2563EB'),
    ('Alinhamento e balanceamento', 'INCOME', 'Serviços', '#2563EB'),
    ('Venda de peças', 'INCOME', 'Vendas', '#059669'),
    ('Venda de pneus', 'INCOME', 'Vendas', '#059669'),
    ('Venda de acessórios', 'INCOME', 'Vendas', '#059669'),
    ('Serviços terceirizados repassados', 'INCOME', 'Outras receitas', '#0D9488'),
    ('Contratos e atendimento de frotas', 'INCOME', 'Outras receitas', '#0D9488'),
    ('Guincho e transporte', 'INCOME', 'Outras receitas', '#0D9488'),
    ('Outras receitas', 'INCOME', 'Outras receitas', '#64748B'),
    ('Compra de peças', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Compra de pneus', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Materiais e consumíveis', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Óleos, fluidos e lubrificantes', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Serviços terceirizados', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Comissões', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Taxas de cartão', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Fretes', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Garantias e retrabalho', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Estornos e devoluções', 'EXPENSE', 'Custos variáveis', '#DC2626'),
    ('Folha de pagamento', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Pró-labore', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Aluguel', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Energia elétrica', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Água', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Telefone e internet', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Sistemas e assinaturas', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Contabilidade', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Seguros', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Segurança e monitoramento', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Limpeza', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Marketing e publicidade', 'EXPENSE', 'Despesas fixas', '#EA580C'),
    ('Ferramentas', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Equipamentos', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Manutenção de equipamentos', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Manutenção predial', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('EPIs e uniformes', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Combustível', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Veículos da empresa', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Treinamentos', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Licenças e certificações', 'EXPENSE', 'Operação e estrutura', '#7C3AED'),
    ('Impostos sobre vendas', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Impostos e taxas municipais', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Tarifas bancárias', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Juros e multas', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Empréstimos e financiamentos', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Investimentos e imobilizado', 'EXPENSE', 'Financeiro e tributário', '#B45309'),
    ('Outras despesas', 'EXPENSE', 'Financeiro e tributário', '#64748B')
)
INSERT INTO financial_categories (tenant_id, name, type, "group", color, is_system)
SELECT t.id, d.name, d.type, d."group", d.color, TRUE
FROM tenants t
CROSS JOIN defaults d
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM financial_categories c
    WHERE c.tenant_id = t.id
      AND LOWER(c.name) = LOWER(d.name)
      AND c.type = d.type
      AND c.deleted_at IS NULL
  );
