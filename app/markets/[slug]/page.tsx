'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Market, Position, Resolution } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OddsBars } from '@/components/OddsBars';
import { TradeTicket } from '@/components/TradeTicket';
import { dateTime, naira, shares, timeLeft } from '@/lib/format';

export default function MarketPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const m = (await api<Market>(`/markets/${slug}`)).data;
      setMarket(m);
      setPicked((p) => p ?? [...m.outcomes].sort((a, b) => b.price - a.price)[0]?.id ?? null);
      setResolution((await api<Resolution | null>(`/markets/${m.id}/resolution`)).data);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to load market'); }
  }, [slug]);
  const loadPositions = useCallback(async () => {
    if (!user) { setPositions([]); return; }
    setPositions((await api<Position[]>('/positions').catch(() => ({ data: [] as Position[] }))).data);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadPositions(); }, [loadPositions]);

  if (err) return <div className="alert error">{err}</div>;
  if (!market) return <div className="skeleton" style={{ minHeight: 320 }} />;

  const mine = positions.filter((p) => p.marketId === market.id && p.shares > 0);
  const winner = resolution?.outcomeId ? market.outcomes.find((o) => o.id === resolution.outcomeId)?.label : null;

  return (
    <div className="two-col">
      <div className="stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <span className={`pill ${market.status === 'OPEN' ? 'open' : 'warn'}`}>{market.status === 'OPEN' ? timeLeft(market.closesAt) : market.status.replace('_', ' ')}</span>
            {market.state && <span className="pill">{market.state}</span>}
            <span className="pill">{market.category.toLowerCase()}</span>
          </div>
          <h1>{market.title}</h1>
          <p className="secondary" style={{ margin: 0 }}>{market.description}</p>
        </div>

        {resolution && (
          <div className={`alert ${resolution.confirmedBy ? 'ok' : 'warn'}`}>
            {resolution.confirmedBy
              ? <>Resolved: <strong>{resolution.isVoid ? 'VOID (stakes refunded)' : winner}</strong>. </>
              : <>Resolution proposed: <strong>{resolution.isVoid ? 'VOID' : winner}</strong>, awaiting a second admin. </>}
            Source: <a href={resolution.sourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{new URL(resolution.sourceUrl).hostname}</a>
          </div>
        )}

        <section className="card stack" style={{ gap: 12 }}>
          <div className="spread"><h2>Current odds</h2><span className="muted small">Tap an outcome to trade it</span></div>
          <OddsBars outcomes={market.outcomes} onPick={(o) => setPicked(o.id)} />
        </section>

        {mine.length > 0 && (
          <section className="card stack" style={{ gap: 8 }}>
            <h2>Your position</h2>
            <table className="data">
              <thead><tr><th>Outcome</th><th className="num">Shares</th><th className="num">Cost</th><th className="num">Pays if right</th></tr></thead>
              <tbody>{mine.map((p) => <tr key={p.id}><td>{p.outcomeLabel}</td><td className="num">{shares(p.shares)}</td><td className="num">{naira(p.costKobo)}</td><td className="num">{naira(p.shares * 10_000)}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        <section className="card stack" style={{ gap: 10 }}>
          <h2>How this market resolves</h2>
          <p className="prose" style={{ margin: 0 }}>{market.resolutionRules}</p>
          <div className="kv"><span>Source</span><span>{market.resolutionSource}</span></div>
          <div className="kv"><span>Trading closes</span><span>{dateTime(market.closesAt)}</span></div>
          <div className="kv"><span>Volume</span><span className="num">{naira(market.volumeKobo ?? 0)} · {market.tradeCount ?? 0} trades</span></div>
        </section>
      </div>

      <aside style={{ position: 'sticky', top: 72 }}>
        {picked && (
          <TradeTicket market={market} outcomeId={picked} onTraded={() => { void load(); void loadPositions(); }}
            heldShares={(id) => positions.find((p) => p.outcomeId === id)?.shares ?? 0} />
        )}
      </aside>
    </div>
  );
}
