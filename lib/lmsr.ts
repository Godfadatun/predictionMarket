// Mirrors the server's LMSR (src/utils/lmsr.ts) for client-side quotes. The server is authoritative.
const logSumExp = (xs: number[]) => { const m = Math.max(...xs); return m + Math.log(xs.reduce((s, x) => s + Math.exp(x - m), 0)); };
export const cost = (q: number[], b: number) => b * logSumExp(q.map((x) => x / b));
export const prices = (q: number[], b: number) => { const c = logSumExp(q.map((x) => x / b)); return q.map((x) => Math.exp(x / b - c)); };
export const sharesForSpend = (q: number[], b: number, i: number, spend: number) => {
  const target = cost(q, b) + spend;
  const others = q.filter((_, j) => j !== i).map((x) => x / b);
  const m = Math.max(target / b, ...others);
  const rest = others.reduce((s, x) => s + Math.exp(x - m), 0);
  return b * (m + Math.log(Math.exp(target / b - m) - rest)) - q[i];
};
export const proceedsForSale = (q: number[], b: number, i: number, s: number) => cost(q, b) - cost(q.map((x, j) => (j === i ? x - s : x)), b);
export const FEE_BPS = 200;
export const PAYOUT_KOBO = 10_000;
