'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, Position } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { naira, shares } from '@/lib/format';

export default function Portfolio() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<Position[] | null>(null);
  useEffect(() => { if (user) api<Position[]>('/positions').then((r) => setRows(r.data)).catch(() => setRows([])); }, [user]);
  if (!ready) return <div className="skeleton" />;
  if (!user) return <div className="card"><p>Log in to see your positions.</p><Link className="btn primary" href="/login">Log in</Link></div>;
  const open = rows?.filter((r) => r.marketStatus === 'OPEN' || r.marketStatus === 'PENDING_RESOLUTION') ?? [];
  const settled = rows?.filter((r) => r.marketStatus === 'RESOLVED' || r.marketStatus === 'VOID') ?? [];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Portfolio</h1>
      {!rows && <div className="skeleton" />}
      {rows && rows.length === 0 && <p className="muted">No positions yet. <Link href="/" style={{ textDecoration: 'underline' }}>Browse markets</Link></p>}
      {open.length > 0 && (
        <section className="card scroll-x"><h2 style={{ marginBottom: 8 }}>Open</h2>
          <table className="data"><thead><tr><th>Market</th><th>Outcome</th><th className="num">Shares</th><th className="num">Cost</th><th className="num">Pays if right</th></tr></thead>
            <tbody>{open.map((p) => <tr key={p.id}><td><Link href={`/markets/${p.marketSlug}`} style={{ textDecoration: 'underline' }}>{p.marketTitle}</Link></td><td>{p.outcomeLabel}</td><td className="num">{shares(p.shares)}</td><td className="num">{naira(p.costKobo)}</td><td className="num">{naira(p.shares * 10_000)}</td></tr>)}</tbody>
          </table></section>
      )}
      {settled.length > 0 && (
        <section className="card scroll-x"><h2 style={{ marginBottom: 8 }}>Settled</h2>
          <table className="data"><thead><tr><th>Market</th><th>Outcome</th><th className="num">Cost</th><th className="num">Paid out</th></tr></thead>
            <tbody>{settled.map((p) => <tr key={p.id}><td>{p.marketTitle}</td><td>{p.outcomeLabel}</td><td className="num">{naira(p.costKobo)}</td><td className="num">{naira(p.payoutKobo)}</td></tr>)}</tbody>
          </table></section>
      )}
    </div>
  );
}
