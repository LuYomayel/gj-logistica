import { buildRefPrefix, buildRef } from './ref-generator';

describe('ref-generator', () => {
  describe('buildRefPrefix', () => {
    it('mayúsculas y espacio → guion medio (caso SYNG BIO)', () => {
      expect(buildRefPrefix('syng bio')).toBe('SYNG-BIO');
      expect(buildRefPrefix('SYNG BIO')).toBe('SYNG-BIO');
    });

    it('códigos simples quedan igual en mayúsculas', () => {
      expect(buildRefPrefix('NK')).toBe('NK');
      expect(buildRefPrefix('adama')).toBe('ADAMA');
      expect(buildRefPrefix('lemon')).toBe('LEMON');
      expect(buildRefPrefix('CORTEVA')).toBe('CORTEVA');
    });

    it('colapsa múltiples espacios/símbolos y recorta guiones de los extremos', () => {
      expect(buildRefPrefix('  lemon  fresh ')).toBe('LEMON-FRESH');
      expect(buildRefPrefix('a.b_c')).toBe('A-B-C');
      expect(buildRefPrefix('-NK-')).toBe('NK');
    });

    it('maneja vacío/undefined sin romper', () => {
      expect(buildRefPrefix('')).toBe('');
      expect(buildRefPrefix(undefined as unknown as string)).toBe('');
    });
  });

  describe('buildRef', () => {
    it('arma PREFIX-N sin padding', () => {
      expect(buildRef('SYNG-BIO', 1)).toBe('SYNG-BIO-1');
      expect(buildRef('NK', 30)).toBe('NK-30');
      expect(buildRef('ADAMA', 17)).toBe('ADAMA-17');
    });
  });
});
