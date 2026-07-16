export function stringToSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function stringToCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

// Compartilhado entre backend e frontend: JSON na rede é snake_case
// (NAMING_CONVENTIONS.md), código TS dos dois lados é camelCase.
export function keysToSnake<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => keysToSnake(item)) as T;
  }
  if (isPlainObject(input)) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [stringToSnakeCase(key), keysToSnake(value)])) as T;
  }
  return input as T;
}

export function keysToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => keysToCamel(item)) as T;
  }
  if (isPlainObject(input)) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [stringToCamelCase(key), keysToCamel(value)])) as T;
  }
  return input as T;
}
