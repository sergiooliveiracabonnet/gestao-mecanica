import { DocumentValidatorService } from './document-validator.service';

describe('DocumentValidatorService', () => {
  let service: DocumentValidatorService;

  beforeEach(() => {
    service = new DocumentValidatorService();
  });

  describe('CPF', () => {
    it('accepts a valid CPF with formatting', () => {
      const result = service.validate('111.444.777-35');
      expect(result).toEqual({ valid: true, type: 'CPF', normalized: '11144477735' });
    });

    it('accepts a valid CPF without formatting', () => {
      expect(service.validate('11144477735').valid).toBe(true);
    });

    it('rejects a CPF with a wrong check digit', () => {
      expect(service.validate('11144477736').valid).toBe(false);
    });

    it('rejects a CPF made of a single repeated digit', () => {
      expect(service.validate('11111111111').valid).toBe(false);
    });
  });

  describe('CNPJ', () => {
    it('accepts a valid CNPJ with formatting', () => {
      const result = service.validate('11.444.777/0001-61');
      expect(result).toEqual({ valid: true, type: 'CNPJ', normalized: '11444777000161' });
    });

    it('accepts a valid CNPJ without formatting', () => {
      expect(service.validate('11444777000161').valid).toBe(true);
    });

    it('rejects a CNPJ with a wrong check digit', () => {
      expect(service.validate('11444777000162').valid).toBe(false);
    });

    it('rejects a CNPJ made of a single repeated digit', () => {
      expect(service.validate('11111111111111').valid).toBe(false);
    });
  });

  it('rejects a document with an invalid length', () => {
    const result = service.validate('123');
    expect(result).toEqual({ valid: false, type: null, normalized: '123' });
  });
});
