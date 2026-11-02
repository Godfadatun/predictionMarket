'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateTime, naira } from '@/lib/format';

interface Entry { id: string; kind: string; amountKobo: number; balanceAfterKobo: number; createdAt: string }
const KIND: Record<string, string> = { DEPOSIT: 'Deposit', TRADE_BUY: 'Bought shares', TRADE_SELL: 'Sold shares', PAYOUT: 'Winnings', REFUND: 'Refund' };

export default function WalletPage() {
  const { user, ready, balanceKobo } = useAuth();
  const [amount, setAmount] = useState('5000');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (user) api<Entry[]>('/wallet/ledger?limit=50').then((r) => setEntries(r.data)).catch(() => undefined); }, [user, balanceKobo]);

  if (!ready) return <div className="skeleton" />;
  if (!user) return <div className="card"><p>Log in to see your wallet.</p><Link className="btn primary" href="/login">Log in</Link></div>;

  const deposit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ authorizationUrl: string }>('/wallet/deposits', { method: 'POST', body: { amountKobo: Math.round(Number(amount) * 100) } });
      window.location.href = r.data.authorizationUrl;
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not start deposit'); setBusy(false); }
  };

  return (
    <div className="two-col">
      <div className="stack">
        <section className="card">
          <span className="muted small">Wallet balance</span>
          <div className="num" style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{naira(balanceKobo ?? 0, { decimals: true })}</div>
        </section>
        <section className="card stack" style={{ gap: 8 }}>
          <h2>Activity</h2>
          {entries.length === 0 ? <p className="muted" style={{ margin: 0 }}>No activity yet.</p> : (
            <div className="scroll-x"><table className="data">
              <thead><tr><th>When</th><th>What</th><th className="num">Amount</th><th className="num">Balance</th></tr></thead>
              <tbody>{entries.map((e) => (
                <tr key={e.id}><td>{dateTime(e.createdAt)}</td><td>{KIND[e.kind] ?? e.kind}</td>
                  <td className="num" style={{ color: e.amountKobo >= 0 ? 'var(--good)' : undefined }}>{e.amountKobo >= 0 ? '+' : '−'}{naira(Math.abs(e.amountKobo), { decimals: true })}</td>
                  <td className="num">{naira(e.balanceAfterKobo, { decimals: true })}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      </div>
      <aside className="card stack" style={{ gap: 12 }}>
        <h2>Add funds</h2>
        <label className="field">Amount (₦)
          <input className="input num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
        </label>
        <div className="row">{[1000, 5000, 10000, 50000].map((v) => <button key={v} className="tab" onClick={() => setAmount(String(v))}>₦{v.toLocaleString()}</button>)}</div>
        {err && <div className="alert error">{err}</div>}
        <button className="btn primary block" disabled={busy || Number(amount) < 100} onClick={() => void deposit()}>{busy ? 'Redirecting…' : 'Pay with Paystack'}</button>
        <span className="muted small">Card, bank transfer or USSD via Paystack. Minimum ₦100.</span>
      </aside>
    </div>
  );
}
