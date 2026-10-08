/**
 * Espejo de `buildRefPrefix` del backend (backend/src/products/ref-generator.ts):
 * normaliza el código de una organización al prefijo de los refs autogenerados.
 * Si cambia allá, cambiarlo acá — el formulario lo usa para validar y previsualizar.
 *
 * Ej: "SYNG EVENTOS" → "SYNG-EVENTOS" · "NK" → "NK" · ".." → "" (inválido)
 */
export function buildRefPrefix(code: string): string {
  return (code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
