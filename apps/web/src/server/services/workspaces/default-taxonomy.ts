export const DEFAULT_EXPENSE_TAXONOMY = [
  {
    key: "basic",
    name: "Necessidades básicas",
    children: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Contas e serviços"],
  },
  {
    key: "lifestyle",
    name: "Estilo de vida",
    children: [
      "Lazer e entretenimento",
      "Alimentação fora de casa",
      "Vestuário e calçados",
      "Beleza e cuidados pessoais",
      "Academia e esportes",
      "Assinaturas",
    ],
  },
  {
    key: "financial",
    name: "Financeiros",
    children: [
      "Investimentos",
      "Seguros",
      "Pagamento de dívidas e parcelamentos",
      "Reserva de emergência",
    ],
  },
  {
    key: "eventual",
    name: "Gastos eventuais",
    children: [
      "Viagens e férias",
      "Presentes e datas comemorativas",
      "Reparos e manutenção",
      "Despesas médicas inesperadas",
    ],
  },
  {
    key: "discretionary",
    name: "Gastos pessoais e discricionários",
    children: ["Hobbies", "Pets", "Doações e caridade", "Compras por impulso"],
  },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Salário",
  "Trabalho e autônomo",
  "Benefícios",
  "Rendimentos",
  "Reembolsos",
  "Presentes",
  "Outras receitas",
] as const;
