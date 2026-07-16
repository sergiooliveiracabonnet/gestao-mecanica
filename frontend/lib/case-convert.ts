// Reexporta o utilitário compartilhado — mesma implementação usada pelo
// backend (packages/contracts/src/utils/case-convert.ts), single source of
// truth para a conversão snake_case <-> camelCase (NAMING_CONVENTIONS.md).
export { keysToCamel, keysToSnake } from '@oficina/contracts';
