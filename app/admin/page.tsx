'use client';
import { FormEvent, useMemo, useState } from 'react';
import { api, ApiError, CATEGORIES, Market } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { pct } from '@/lib/format';

type Msg = { kind: 'ok' | 'error' | 'warn'; text: string } | null;
const toLocalInput = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

// "Label = 40" per line → outcomes + optional starting odds (percent).
const parseOutcomes = (text: string) => {
  const rows = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, odds] = l.split(/\s*=\s*/);
    return { label, odds: odds === undefined ? null : Number(odds) };
  });
  const withOdds = rows.every((r) => r.odds !== null && !Number.isNaN(r.odds));
  const total = rows.reduce((s, r) => s + (r.odds ?? 0), 0);
  return { labels: rows.map((r) => r.label), prices: withOdds ? rows.map((r) => r.odds! / 100) : undefined, total, withOdds, anyOdds: rows.some((r) => r.odds !== null) };
};

export default function Admin() {
  const { user, ready } = useAuth();
  const [msg, setMsg] = useState<Msg>(null);
  const [outcomesText, setOutcomesText] = useState('');
  const [market, setMarket] = useState<Market | null>(null);
  const [slug, setSlug] = useState('');
  const parsed = useMemo(() => parseOutcomes(outcomesText), [outcomesText]);
  if (!ready) return <div className="skeleton" />;
  if (user?.role !== 'ADMIN') return <div className="alert error">Admins only.</div>;

  const run = async (fn: () => Promise<{ text: string; warn?: boolean }>) => {
    setMsg(null);
    try { const r = await fn(); setMsg({ kind: r.warn ? 'warn' : 'ok', text: r.text }); } catch (e) { setMsg({ kind: 'error', text: e instanceof ApiError ? `${e.code}: ${e.message}` : 'Failed' }); }
  };
  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    void run(async () => {
      const r = await api<Market>('/markets', { method: 'POST', body: {
        slug: f.slug, title: f.title, description: f.description, category: f.category, state: f.state || null,
        closesAt: new Date(f.closesAt).toISOString(), resolutionSource: f.resolutionSource, resolutionRules: f.resolutionRules,
        liquidityB: Number(f.liquidityB), outcomes: parsed.labels, ...(parsed.prices && { initialPrices: parsed.prices }),
      } });
      return { text: `Created ${r.data.slug}: ${r.data.outcomes.map((o) => `${o.label} ${pct(o.price)}`).join(', ')}`, warn: !!r.warnings?.length };
    });
  };
  const lookup = () => run(async () => { const r = await api<Market>(`/markets/${slug}`); setMarket(r.data); return { text: `Loaded ${r.data.title} (${r.data.status}, ${r.data.tradeCount} trades)` }; });
  const reload = async (id: string) => setMarket((await api<Market>(`/markets/${id}`)).data);
  const update = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body: Record<string, string> = {};
    if (f.description !== market!.description) body.description = f.description;
    if (f.resolutionRules !== market!.resolutionRules) body.resolutionRules = f.resolutionRules;
    if (f.closesAt !== toLocalInput(market!.closesAt)) body.closesAt = new Date(f.closesAt).toISOString();
    void run(async () => { await api(`/markets/${market!.id}`, { method: 'PATCH', body }); await reload(market!.id); return { text: 'Market updated' }; });
  };
  const close = () => run(async () => { await api(`/markets/${market!.id}/close`, { method: 'POST', body: {} }); await reload(market!.id); return { text: 'Trading closed' }; });
  const propose = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    void run(async () => {
      const body = f.outcomeId === 'VOID' ? { void: true, sourceUrl: f.sourceUrl, note: f.note || undefined } : { outcomeId: f.outcomeId, sourceUrl: f.sourceUrl, note: f.note || undefined };
      return { text: (await api(`/markets/${market!.id}/resolution/propose`, { method: 'POST', body })).message };
    });
  };
  const confirm = () => run(async () => ({ text: (await api(`/markets/${market!.id}/resolution/confirm`, { method: 'POST', body: {} })).message }));
  const spotify = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const weekStart = String(new FormData(e.currentTarget).get('weekStart'));
    void run(async () => { const r = await api<Market>('/markets/templates/spotify-weekly', { method: 'POST', body: { weekStart } }); return { text: `${r.message}: ${r.data.slug}`, warn: !!r.warnings?.length }; });
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Admin</h1>
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}
      <div className="two-col">
        <form className="card stack" onSubmit={create}>
          <h2>Create market</h2>
          <label className="field">Slug<input className="input" name="slug" pattern="[a-z0-9-]{3,100}" required /></label>
          <label className="field">Title<input className="input" name="title" required /></label>
          <label className="field">Description<textarea className="input" name="description" rows={2} required /></label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>Category<select className="input" name="category">{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
            <label className="field" style={{ flex: 1 }}>State (optional)<input className="input" name="state" placeholder="Lagos" /></label>
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>Closes at<input className="input" name="closesAt" type="datetime-local" required /></label>
            <label className="field" style={{ flex: 1 }}>Liquidity b<input className="input" name="liquidityB" type="number" defaultValue={250} min={10} /></label>
          </div>
          <label className="field">Outcomes, one per line. Add &quot;= 40&quot; to set starting odds (%)
            <textarea className="input" rows={5} required value={outcomesText} onChange={(e) => setOutcomesText(e.target.value)} placeholder={'Bola Tinubu (APC) = 40\nPeter Obi (NDC) = 30\nAtiku Abubakar (ADC) = 25\nOther candidate = 5'} />
          </label>
          {parsed.anyOdds && !parsed.withOdds && <div className="alert warn">Give every outcome a starting %, or none of them.</div>}
          {parsed.withOdds && <span className={`small ${Math.abs(parsed.total - 100) > 1 ? 'alert error' : 'muted'}`}>Starting odds total {parsed.total.toFixed(1)}% {Math.abs(parsed.total - 100) > 1 ? '(must be 99–101%)' : ''}</span>}
          <label className="field">Resolution source<input className="input" name="resolutionSource" required /></label>
          <label className="field">Resolution rules<textarea className="input" name="resolutionRules" rows={3} required /></label>
          <button className="btn primary" disabled={parsed.anyOdds && !parsed.withOdds}>Create (funds pool from house subsidy)</button>
        </form>

        <div className="stack">
          <div className="card stack">
            <h2>Manage a market</h2>
            <div className="row"><input className="input" style={{ flex: 1 }} placeholder="market slug" value={slug} onChange={(e) => setSlug(e.target.value)} /><button className="btn" onClick={() => void lookup()}>Load</button></div>
            {market && (
              <>
                <form key={market.id + market.closesAt} className="stack" onSubmit={update}>
                  <label className="field">Description<textarea className="input" name="description" rows={2} defaultValue={market.description} /></label>
                  <label className="field">Resolution rules {market.tradeCount > 0 && <span className="muted">(locked: market has trades)</span>}
                    <textarea className="input" name="resolutionRules" rows={3} defaultValue={market.resolutionRules} disabled={market.tradeCount > 0} />
                  </label>
                  <label className="field">Closes at<input className="input" name="closesAt" type="datetime-local" defaultValue={toLocalInput(market.closesAt)} /></label>
                  <div className="row"><button className="btn">Save changes</button><button type="button" className="btn" onClick={() => void close()}>Close trading now</button></div>
                </form>
                <hr style={{ border: 0, borderTop: '1px solid var(--border)', width: '100%' }} />
                <form className="stack" onSubmit={propose}>
                  <h3>Resolve</h3>
                  <label className="field">Winner<select className="input" name="outcomeId">{market.outcomes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}<option value="VOID">VOID (refund everyone)</option></select></label>
                  <label className="field">Source URL<input className="input" name="sourceUrl" type="url" required placeholder="https://inecelectionresults.ng/…" /></label>
                  <label className="field">Note<input className="input" name="note" placeholder="e.g. Form EC8D page 2" /></label>
                  <button className="btn">Propose (step 1)</button>
                </form>
                <button className="btn primary" onClick={() => void confirm()}>Confirm & pay out (step 2, different admin)</button>
                <span className="muted small">Winners with a verified bank account receive ₦1,000+ automatically.</span>
              </>
            )}
          </div>
          <form className="card stack" onSubmit={spotify}>
            <h2>Spotify weekly market</h2>
            <p className="muted small" style={{ margin: 0 }}>Runs automatically every Wednesday. Use this to open a specific week (chart weeks start on Friday).</p>
            <label className="field">Week starting (Friday)<input className="input" type="date" name="weekStart" required /></label>
            <button className="btn">Open week</button>
          </form>
        </div>
      </div>
    </div>
  );
}
