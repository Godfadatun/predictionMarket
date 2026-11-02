'use client';
import { FormEvent, useState } from 'react';
import { api, ApiError, CATEGORIES, Market } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Admin() {
  const { user, ready } = useAuth();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [slug, setSlug] = useState('');
  if (!ready) return <div className="skeleton" />;
  if (user?.role !== 'ADMIN') return <div className="alert error">Admins only.</div>;

  const run = async (fn: () => Promise<string>) => {
    setMsg(null);
    try { setMsg({ kind: 'ok', text: await fn() }); } catch (e) { setMsg({ kind: 'error', text: e instanceof ApiError ? `${e.code}: ${e.message}` : 'Failed' }); }
  };
  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    void run(async () => {
      const r = await api<Market>('/markets', { method: 'POST', body: {
        slug: f.slug, title: f.title, description: f.description, category: f.category, state: f.state || null,
        closesAt: new Date(f.closesAt).toISOString(), resolutionSource: f.resolutionSource, resolutionRules: f.resolutionRules,
        liquidityB: Number(f.liquidityB), outcomes: f.outcomes.split('\n').map((s) => s.trim()).filter(Boolean),
      } });
      return `Created ${r.data.slug}`;
    });
  };
  const lookup = () => run(async () => { const r = await api<Market>(`/markets/${slug}`); setMarket(r.data); return `Loaded ${r.data.title} (${r.data.status})`; });
  const propose = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    void run(async () => {
      const body = f.outcomeId === 'VOID' ? { void: true, sourceUrl: f.sourceUrl, note: f.note || undefined } : { outcomeId: f.outcomeId, sourceUrl: f.sourceUrl, note: f.note || undefined };
      const r = await api(`/markets/${market!.id}/resolution/propose`, { method: 'POST', body });
      return r.message;
    });
  };
  const confirm = () => run(async () => (await api(`/markets/${market!.id}/resolution/confirm`, { method: 'POST', body: {} })).message);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Admin</h1>
      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
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
            <label className="field" style={{ flex: 1 }}>Liquidity b<input className="input" name="liquidityB" type="number" defaultValue={1000} min={10} /></label>
          </div>
          <label className="field">Outcomes (one per line)<textarea className="input" name="outcomes" rows={4} required /></label>
          <label className="field">Resolution source<input className="input" name="resolutionSource" required /></label>
          <label className="field">Resolution rules<textarea className="input" name="resolutionRules" rows={3} required /></label>
          <button className="btn primary">Create (funds pool from house subsidy)</button>
        </form>
        <div className="card stack">
          <h2>Resolve market</h2>
          <div className="row"><input className="input" style={{ flex: 1 }} placeholder="market slug" value={slug} onChange={(e) => setSlug(e.target.value)} /><button className="btn" onClick={() => void lookup()}>Load</button></div>
          {market && (
            <>
              <form className="stack" onSubmit={propose}>
                <label className="field">Winner<select className="input" name="outcomeId">{market.outcomes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}<option value="VOID">VOID (refund everyone)</option></select></label>
                <label className="field">Source URL<input className="input" name="sourceUrl" type="url" required placeholder="https://inecelectionresults.ng/…" /></label>
                <label className="field">Note<input className="input" name="note" placeholder="e.g. Form EC8D page 2" /></label>
                <button className="btn">Propose (step 1)</button>
              </form>
              <button className="btn primary" onClick={() => void confirm()}>Confirm & pay out (step 2, different admin)</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
