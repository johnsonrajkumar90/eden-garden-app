// Small helpers for reading the website's JSON the same forgiving way the native app did.
export type J = Record<string, any>;

/** A string ("" when missing or null). */
export const text = (o: J | null | undefined, k: string, def = ''): string => {
  const v = o?.[k];
  return v === null || v === undefined ? def : String(v);
};
/** A string, or null when missing / blank. */
export const str = (o: J | null | undefined, k: string): string | null => {
  const v = o?.[k];
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.trim() === '' || s === 'null' ? null : s;
};
export const int = (o: J | null | undefined, k: string, def = 0): number => {
  const v = Number(o?.[k]);
  return Number.isFinite(v) ? Math.trunc(v) : def;
};
/** A number, or null. */
export const num = (o: J | null | undefined, k: string): number | null => {
  const v = o?.[k];
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export const bool = (o: J | null | undefined, k: string): boolean => {
  const v = o?.[k];
  return v === true || v === 1 || v === '1' || v === 'true';
};
export const obj = (o: J | null | undefined, k: string): J | null => {
  const v = o?.[k];
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
};
export const objs = (o: J | null | undefined, k: string): J[] => {
  const v = o?.[k];
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
};
export const arr = <T = any>(o: J | null | undefined, k: string): T[] => {
  const v = o?.[k];
  return Array.isArray(v) ? v : [];
};

/** A list of strings (empty values dropped). */
export const strings = (o: J | null | undefined, k: string): string[] => arr<any>(o, k).filter((x) => x !== null && x !== undefined && String(x) !== '').map(String);

/** Price lines come either as [label, amount] pairs (pet services) or as { label, amount } objects (stays). */
export const priceLines = (o: J | null | undefined, k = 'lines'): { label: string; amount: number; note?: string | null }[] =>
  arr<any>(o, k).map((x) => (Array.isArray(x) ? { label: String(x[0] ?? ''), amount: Number(x[1]) || 0 } : x && typeof x === 'object' ? { label: text(x, 'label'), amount: num(x, 'amount') || 0, note: str(x, 'note') } : null))
    .filter(Boolean) as any;
