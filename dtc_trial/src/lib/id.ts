import { customAlphabet } from 'nanoid';

const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export const newId = (prefix = '') => (prefix ? `${prefix}_${nano()}` : nano());

const CODE_RE = /^[A-Za-z0-9_-]+$/;
export const isValidCode = (code: string) => CODE_RE.test(code);

/** "Body Shop #2" → "BODY_SHOP_2" */
export function toCode(name: string): string {
  const code = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return code || 'NODE';
}

/** Returns `base` or `base_02`, `base_03`… not present in `taken`. */
export function uniqueCode(base: string, taken: Iterable<string>, alwaysNumber = false): string {
  const set = new Set(Array.from(taken, (c) => c.toUpperCase()));
  if (!alwaysNumber && !set.has(base.toUpperCase())) return base;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}_${String(i).padStart(2, '0')}`;
    if (!set.has(candidate.toUpperCase())) return candidate;
  }
  return `${base}_${nano().slice(0, 4).toUpperCase()}`;
}

/** Same as uniqueCode but for free-form display names: "Robot", "Robot 2"… */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  const stem = base.replace(/\s+\d+$/, '');
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem} ${i}`;
    if (!set.has(candidate)) return candidate;
  }
  return `${stem} ${nano().slice(0, 4)}`;
}
