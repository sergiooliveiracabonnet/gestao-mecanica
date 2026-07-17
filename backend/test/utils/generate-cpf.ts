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

function randomDigits(length: number): string {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

export function generateValidCpf(): string {
  // Base9 puramente aleatória (1 bilhão de combinações) em vez de
  // Date.now()+counter — cada arquivo de teste e2e roda num processo/módulo
  // Jest separado com seu próprio `counter` zerado, então dois arquivos
  // chamando isso no mesmo milissegundo geravam o MESMO CPF, colidindo no
  // unique constraint de `document` de forma intermitente (flake real,
  // reproduzido rodando a suíte completa).
  let base9 = randomDigits(9);
  while (/^(\d)\1{8}$/.test(base9)) {
    base9 = randomDigits(9); // evita rejeição por "dígito único repetido" do validador
  }
  const digit1 = checkDigit(base9, CPF_DIGIT1_WEIGHTS);
  const digit2 = checkDigit(base9 + digit1, CPF_DIGIT2_WEIGHTS);
  return `${base9}${digit1}${digit2}`;
}
