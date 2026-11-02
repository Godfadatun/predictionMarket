'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, Market } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { naira, pct, shares as fmtShares, sharePrice } from '@/lib/format';
import { FEE_BPS, PAYOUT_KOBO, prices, proceedsForSale, sharesForSpend } from '@/lib/lmsr';

const SLIPPAGE = 0.02;

export function TradeTicket({ market, outcomeId, onTraded, heldShares }: {
  market: Market; outcomeId: string; onTraded: () => void; heldShares: (outcomeId: string) => number;
}) {
  const { user, balanceKobo, refresh } = useAuth();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selected, setSelected] = useState(outcomeId);
  const [amount, setAmount] = useState('1000');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  useEffect(() => setSelected(outcomeId), [outcomeId]);

  const open = market.status === 'OPEN' && new Date(market.closesAt).getTime() > Date.now();
  const idx = market.outcomes.findIndex((o) => o.id === selected);
  const q = market.outcomes.map((o) => o.shares);
  const value = Number(amount) || 0;
  const held = heldShares(selected);

  const quote = useMemo(() => {
    if (idx < 0 || value <= 0) return null;
    if (side === 'BUY') {
      const kobo = Math.round(value * 100);
      const fee = Math.ceil((kobo * FEE_BPS) / 10_000);
      const s = sharesForSpend(q, market.liquidityB, idx, (kobo - fee) / PAYOUT_KOBO);
      const after = prices(q.map((x, i) => (i === idx ? x + s : x)), market.liquidityB)[idx];
      return { kobo, fee, shares: s, avg: (kobo - fee) / s / PAYOUT_KOBO, payout: s * PAYOUT_KOBO, after };
    }
    const s = Math.min(value, held);
    if (s <= 0) return null;
    const gross = Math.floor(proceedsForSale(q, market.liquidityB, idx, s) * PAYOUT_KOBO);
    const fee = Math.ceil((gross * FEE_BPS) / 10_000);
    const after = prices(q.map((x, i) => (i === idx ? x - s : x)), market.liquidityB)[idx];
    return { kobo: gross - fee, fee, shares: s, avg: gross / s / PAYOUT_KOBO, payout: gross - fee, after };
  }, [side, idx, value, held, market.liquidityB, q.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!quote) return;
    setBusy(true); setMsg(null);
    const body = side === 'BUY'
      ? { outcomeId: selected, side, amountKobo: quote.kobo, minShares: quote.shares * (1 - SLIPPAGE), idempotencyKey: crypto.randomUUID() }
      : { outcomeId: selected, side, shares: quote.shares, minProceedsKobo: Math.floor(quote.payout * (1 - SLIPPAGE)), idempotencyKey: crypto.randomUUID() };
    try {
      const res = await api<{ trade: { shares: number; amountKobo: number } }>(`/markets/${market.id}/trades`, { method: 'POST', body });
      const t = res.data.trade;
      setMsg({ kind: res.warnings?.length ? 'warn' : 'ok', text: side === 'BUY' ? `Bought ${fmtShares(t.shares)} shares for ${naira(t.amountKobo)}.` : `Sold ${fmtShares(t.shares)} shares.` + (res.warnings?.length ? ' This trade moved the price a lot.' : '') });
      await refresh(); onTraded();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Trade failed' });
    } finally { setBusy(false); }
  };

  if (!open) return <div className="card"><p className="secondary" style={{ margin: 0 }}>Trading is closed for this market.</p></div>;

  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="segmented" role="group" aria-label="Buy or sell">
        <button aria-pressed={side === 'BUY'} onClick={() => { setSide('BUY'); setAmount('1000'); }}>Buy</button>
        <button aria-pressed={side === 'SELL'} onClick={() => { setSide('SELL'); setAmount(String(Math.floor(held * 100) / 100 || '')); }}>Sell</button>
      </div>
      <label className="field">Outcome
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {market.outcomes.map((o) => <option key={o.id} value={o.id}>{o.label} · {pct(o.price)}</option>)}
        </select>
      </label>
      <label className="field">{side === 'BUY' ? 'Amount (₦)' : `Shares to sell (you hold ${fmtShares(held)})`}
        <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
      </label>
      {side === 'BUY' && <div className="row">{[500, 1000, 5000, 10000].map((v) => <button key={v} className="tab" onClick={() => setAmount(String(v))}>₦{v.toLocaleString()}</button>)}</div>}
      {quote && (
        <div>
          <div className="kv"><span>Avg. price per share</span><span className="num">{sharePrice(quote.avg)}</span></div>
          <div className="kv"><span>{side === 'BUY' ? 'Shares you get' : 'Shares sold'}</span><span className="num">{fmtShares(quote.shares)}</span></div>
          <div className="kv"><span>Fee (2%)</span><span className="num">{naira(quote.fee, { decimals: true })}</span></div>
          <div className="kv"><span>{side === 'BUY' ? 'Payout if right' : 'You receive'}</span><strong className="num">{naira(quote.payout)}</strong></div>
          <div className="kv"><span>New chance</span><span className="num">{pct(quote.after)}</span></div>
        </div>
      )}
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}
      {user ? (
        <>
          <button className="btn primary block" disabled={busy || !quote} onClick={() => void submit()}>{busy ? 'Placing…' : side === 'BUY' ? 'Buy shares' : 'Sell shares'}</button>
          <span className="muted small">Balance {naira(balanceKobo ?? 0)} · <Link href="/wallet" style={{ textDecoration: 'underline' }}>Add funds</Link></span>
        </>
      ) : <Link href="/login" className="btn primary block">Log in to trade</Link>}
    </div>
  );
}
