'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, PayoutAccount, Withdrawal } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateTime, naira } from '@/lib/format';

const STATUS_TEXT: Record<PayoutAccount['status'], string> = {
  PENDING_VERIFICATION: 'Verifying your BVN with the bank…',
  VERIFIED: 'Verified',
  FAILED: 'Verification failed',
};
const WD_TEXT: Record<string, string> = { PENDING: 'Processing', SUCCESS: 'Sent', FAILED: 'Failed – refunded', REVERSED: 'Reversed – refunded' };

export function PayoutPanel() {
  const { balanceKobo, refresh } = useAuth();
  const [account, setAccount] = useState<PayoutAccount | null | undefined>(undefined);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [a, w] = await Promise.all([api<PayoutAccount | null>('/payouts/account'), api<Withdrawal[]>('/payouts/withdrawals?limit=10')]);
    setAccount(a.data); setWithdrawals(w.data);
  }, []);
  useEffect(() => { void load().catch(() => setAccount(null)); }, [load]);
  useEffect(() => { if (account === null || account?.status === 'FAILED') api<{ name: string; code: string }[]>('/payouts/banks').then((r) => setBanks(r.data)).catch(() => undefined); }, [account]);
  useEffect(() => {
    if (account?.status !== 'PENDING_VERIFICATION') return;
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [account?.status, load]);

  const submitAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<PayoutAccount>('/payouts/account', { method: 'POST', body: { bankCode: f.get('bankCode'), accountNumber: f.get('accountNumber'), bvn: f.get('bvn') } });
      setAccount(r.data); setMsg({ kind: 'ok', text: r.message });
    } catch (e2) { setMsg({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Could not add account' }); }
    finally { setBusy(false); }
  };

  const withdraw = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ status: string; amountKobo: number }>('/payouts/withdrawals', { method: 'POST', body: { amountKobo: Math.round(Number(amount) * 100), idempotencyKey: crypto.randomUUID() } });
      setMsg({ kind: r.warnings?.length ? 'warn' : 'ok', text: r.message }); setAmount('');
    } catch (e2) { setMsg({ kind: 'error', text: e2 instanceof ApiError ? e2.message : 'Withdrawal failed' }); }
    finally { setBusy(false); await refresh(); await load(); }
  };

  if (account === undefined) return <div className="skeleton" style={{ minHeight: 160 }} />;

  return (
    <section className="card stack" style={{ gap: 12 }}>
      <h2>Payout account</h2>
      {account && account.status !== 'FAILED' ? (
        <div>
          <div className="kv"><span>Bank</span><span>{account.bankName ?? account.bankCode}</span></div>
          <div className="kv"><span>Account</span><span className="num">{account.accountNumber} · {account.accountName}</span></div>
          <div className="kv"><span>Status</span><span className={`pill ${account.status === 'VERIFIED' ? 'open' : 'warn'}`}>{STATUS_TEXT[account.status]}</span></div>
          {account.status === 'VERIFIED' && <p className="muted small" style={{ margin: '8px 0 0' }}>Winnings of ₦1,000 or more are sent here automatically when a market settles.</p>}
        </div>
      ) : (
        <form className="stack" style={{ gap: 10 }} onSubmit={submitAccount}>
          {account?.status === 'FAILED' && <div className="alert error">Verification failed: {account.failureReason}. Check your details and try again.</div>}
          <p className="secondary small" style={{ margin: 0 }}>Withdrawals and winnings go to a bank account in <strong>your own name</strong>. We check your BVN against the account with Paystack and keep only its last 4 digits.</p>
          <label className="field">Bank
            <select className="input" name="bankCode" required defaultValue="">
              <option value="" disabled>Select your bank</option>
              {banks.map((b) => <option key={`${b.code}-${b.name}`} value={b.code}>{b.name}</option>)}
            </select>
          </label>
          <label className="field">Account number<input className="input num" name="accountNumber" inputMode="numeric" pattern="\d{10}" maxLength={10} required /></label>
          <label className="field">BVN<input className="input num" name="bvn" inputMode="numeric" pattern="\d{11}" maxLength={11} required autoComplete="off" /></label>
          <button className="btn primary block" disabled={busy}>{busy ? 'Checking…' : 'Verify and save'}</button>
        </form>
      )}

      {account?.status === 'VERIFIED' && (
        <div className="stack" style={{ gap: 8 }}>
          <label className="field">Withdraw (₦)
            <input className="input num" inputMode="numeric" value={amount} placeholder={`Up to ${naira(balanceKobo ?? 0)}`} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <button className="btn block" disabled={busy || Number(amount) < 500 || Number(amount) * 100 > (balanceKobo ?? 0)} onClick={() => void withdraw()}>{busy ? 'Sending…' : 'Withdraw to bank'}</button>
          <span className="muted small">Minimum ₦500. Transfer fees are on us.</span>
        </div>
      )}
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}

      {withdrawals.length > 0 && (
        <div className="scroll-x"><table className="data">
          <thead><tr><th>When</th><th>Type</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{withdrawals.map((w) => <tr key={w.reference}><td>{dateTime(w.createdAt)}</td><td>{w.source === 'AUTO_PAYOUT' ? 'Winnings' : 'Withdrawal'}</td><td className="num">{naira(w.amountKobo)}</td><td>{WD_TEXT[w.status] ?? w.status}</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
