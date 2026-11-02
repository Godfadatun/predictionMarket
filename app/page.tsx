'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError, CATEGORIES, Market } from '@/lib/api';
import { MarketCard } from '@/components/MarketCard';
import { OddsBars } from '@/components/OddsBars';
import { dateTime } from '@/lib/format';

export default function Home() {
  const [category, setCategory] = useState<string>('PRESIDENTIAL');
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [featured, setFeatured] = useState<Market | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api<Market>('/markets/presidential-2027-winner').then((r) => setFeatured(r.data)).catch(() => setFeatured(null)); }, []);
  useEffect(() => {
    setMarkets(null); setErr(null);
    api<Market[]>(`/markets?category=${category}&status=OPEN`).then((r) => setMarkets(r.data)).catch((e) => setErr(e instanceof ApiError ? e.message : 'Failed to load markets'));
  }, [category]);

  const national = markets?.filter((m) => !m.state) ?? [];
  const states = markets?.filter((m) => m.state) ?? [];

  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="hero">
        <h1>What will happen in Nigeria?</h1>
        <p>Buy shares in outcomes you believe in. Each share pays ₦100 if you&apos;re right, and the price is the crowd&apos;s live odds.</p>
      </section>

      {featured && (
        <section className="card stack" style={{ gap: 14 }}>
          <div className="spread">
            <span className="pill open">Featured · Presidential poll 16 Jan 2027</span>
            <Link href="/states" className="small" style={{ textDecoration: 'underline' }}>See all 37 states →</Link>
          </div>
          <Link href={`/markets/${featured.slug}`}><h2>{featured.title}</h2></Link>
          <OddsBars outcomes={featured.outcomes} limit={5} />
          <span className="muted small">Trading closes {dateTime(featured.closesAt)}</span>
        </section>
      )}

      <div className="tabs" role="group" aria-label="Category">
        {CATEGORIES.map((c) => <button key={c.key} className="tab" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>{c.label}</button>)}
      </div>

      {err && <div className="alert error">{err}</div>}
      {!markets && !err && <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>}
      {markets && markets.length === 0 && <p className="muted">No open markets in this category yet.</p>}
      {national.length > 0 && <div className="grid">{national.map((m) => <MarketCard key={m.id} m={m} />)}</div>}
      {states.length > 0 && (
        <section className="stack">
          <div className="spread"><h2>By state</h2>{category === 'PRESIDENTIAL' && <Link href="/states" className="btn">Open state map</Link>}</div>
          <div className="grid">{states.map((m) => <MarketCard key={m.id} m={m} />)}</div>
        </section>
      )}
    </div>
  );
}
