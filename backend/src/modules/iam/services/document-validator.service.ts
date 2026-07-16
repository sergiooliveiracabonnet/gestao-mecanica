import { Injectable } from '@nestjs/common';

export type DocumentType = 'CPF' | 'CNPJ';

export interface DocumentValidationResult {
  valid: boolean;
  type: DocumentType | null;
  normalized: string;
}

const CNPJ_DIGIT1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_DIGIT2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

@Injectable()
export class DocumentValidatorService {
  validate(document: string): DocumentValidationResult {
    const normalized = document.replace(/\D/g, '');

    if (normalized.length === 11) {
      return { valid: this.isValidCpf(normalized), type: 'CPF', normalized };
    }

    if (normalized.length === 14) {
      return { valid: this.isValidCnpj(normalized), type: 'CNPJ', normalized };
    }

    return { valid: false, type: null, normalized };
  }

  private isValidCpf(digits: string): boolean {
    if (/^(\d)\1{10}$/.test(digits)) {
      return false;
    }

    const base9 = digits.slice(0, 9);
    const digit1 = this.calcCheckDigit(base9, this.weightsDescendingFrom(9));
    const base10 = base9 + digit1;
    const digit2 = this.calcCheckDigit(base10, this.weightsDescendingFrom(10));

    return digits === `${base9}${digit1}${digit2}`;
  }

  private isValidCnpj(digits: string): boolean {
    if (/^(\d)\1{13}$/.test(digits)) {
      return false;
    }

    const base12 = digits.slice(0, 12);
    const digit1 = this.calcCheckDigit(base12, CNPJ_DIGIT1_WEIGHTS);
    const base13 = base12 + digit1;
    const digit2 = this.calcCheckDigit(base13, CNPJ_DIGIT2_WEIGHTS);

    return digits === `${base12}${digit1}${digit2}`;
  }

  private calcCheckDigit(base: string, weights: number[]): number {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  // count=9  -> [10,9,8,7,6,5,4,3,2]
  // count=10 -> [11,10,9,8,7,6,5,4,3,2]
  private weightsDescendingFrom(count: number): number[] {
    return Array.from({ length: count }, (_, i) => count + 1 - i);
  }
}
