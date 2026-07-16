// Gera um CPF sintaticamente válido (dígitos verificadores corretos) para
// os testes e2e de signup, que passam pelo endpoint HTTP real e portanto
// precisam de um documento que passe pelo DocumentValidatorService — um
// CPF fixo reutilizado entre testes colide (unique constraint em `document`)
// assim que mais de um signup roda na mesma suíte/banco.
const CPF_DIGIT1_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_DIGIT2_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

function checkDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

let counter = 0;

export function generateValidCpf(): string {
  counter += 1;
  const base9 = String((Date.now() + counter) % 900000000 + 100000000).slice(0, 9);
  const digit1 = checkDigit(base9, CPF_DIGIT1_WEIGHTS);
  const digit2 = checkDigit(base9 + digit1, CPF_DIGIT2_WEIGHTS);
  return `${base9}${digit1}${digit2}`;
}
