export const naira = (kobo: number, opts: { decimals?: boolean } = {}) =>
  `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: opts.decimals ? 2 : 0, maximumFractionDigits: opts.decimals ? 2 : 0 })}`;
export const pct = (p: number) => `${(p * 100).toFixed(p >= 0.995 || p < 0.01 ? 1 : 0)}%`;
export const sharePrice = (p: number) => `₦${(p * 100).toFixed(2)}`;
export const shares = (s: number) => s.toLocaleString('en-NG', { maximumFractionDigits: 2 });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WAT';
export const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
};
