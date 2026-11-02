'use client';
import { useEffect, useState } from 'react';
import { api, ApiError, Market } from '@/lib/api';
import { StateMap } from '@/components/StateMap';

export default function StatesPage() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Market[]>('/markets?category=PRESIDENTIAL&limit=200').then((r) => setMarkets(r.data)).catch((e) => setErr(e instanceof ApiError ? e.message : 'Failed to load'));
  }, []);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="hero">
        <h1>2027 presidential race, state by state</h1>
        <p>Each tile shows which candidate the market thinks will win that state. Tap a state to trade it.</p>
      </section>
      {err && <div className="alert error">{err}</div>}
      {!markets && !err && <div className="skeleton" style={{ minHeight: 360 }} />}
      {markets && <div className="card"><StateMap markets={markets} /></div>}
    </div>
  );
}
