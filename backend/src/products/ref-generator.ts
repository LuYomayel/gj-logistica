/**
 * Helpers para la generación automática del `ref` de productos por organización.
 *
 * El prefijo se deriva del `code` del tenant (el valor entre paréntesis del
 * dropdown de organizaciones, ej "syng bio" → "SYNG-BIO").
 */

/**
 * Normaliza el `code` de un tenant a un prefijo de ref:
 * - mayúsculas
 * - cualquier secuencia de caracteres no alfanuméricos (espacios incluidos) pasa a un único guion medio
 * - sin guiones al inicio/fin
 *
 * Ej: "syng bio" → "SYNG-BIO" · "NK" → "NK" · " lemon  fresh " → "LEMON-FRESH"
 */
export function buildRefPrefix(code: string): string {
  return (code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Arma el ref completo: `${PREFIX}-${n}` (sin padding). Ej buildRef('NK', 3) → 'NK-3'. */
export function buildRef(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}
