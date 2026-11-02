'use client';
import Link from 'next/link';
import { Market } from '@/lib/api';
import { LEADER_SLOTS, leaderColor } from '@/lib/colors';
import { pct } from '@/lib/format';

// Tile-grid cartogram: one equal tile per state, placed roughly where it sits on the map (col, row).
const LAYOUT: Record<string, [number, number]> = {
  Sokoto: [1, 0], Katsina: [3, 0], Jigawa: [4, 0], Yobe: [5, 0], Borno: [6, 0],
  Kebbi: [0, 1], Zamfara: [2, 1], Kano: [3, 1], Bauchi: [4, 1], Gombe: [5, 1], Adamawa: [6, 1],
  Niger: [1, 2], Kaduna: [2, 2], FCT: [3, 2], Plateau: [4, 2], Taraba: [5, 2],
  Oyo: [0, 3], Kwara: [1, 3], Kogi: [2, 3], Nasarawa: [3, 3], Benue: [4, 3],
  Ogun: [0, 4], Osun: [1, 4], Ekiti: [2, 4], Edo: [3, 4], Enugu: [4, 4], Ebonyi: [5, 4],
  Lagos: [0, 5], Ondo: [1, 5], Delta: [2, 5], Anambra: [3, 5], Abia: [4, 5], 'Cross River': [5, 5],
  Bayelsa: [1, 6], Rivers: [2, 6], Imo: [3, 6], 'Akwa Ibom': [4, 6],
};
const TIE_MARGIN = 0.02;
const CODE: Record<string, string> = {
  Abia: 'AB', Adamawa: 'AD', 'Akwa Ibom': 'AK', Anambra: 'AN', Bauchi: 'BA', Bayelsa: 'BY', Benue: 'BE', Borno: 'BO', 'Cross River': 'CR',
  Delta: 'DE', Ebonyi: 'EB', Edo: 'ED', Ekiti: 'EK', Enugu: 'EN', FCT: 'FC', Gombe: 'GO', Imo: 'IM', Jigawa: 'JI', Kaduna: 'KD', Kano: 'KN',
  Katsina: 'KT', Kebbi: 'KE', Kogi: 'KO', Kwara: 'KW', Lagos: 'LA', Nasarawa: 'NA', Niger: 'NI', Ogun: 'OG', Ondo: 'ON', Osun: 'OS', Oyo: 'OY',
  Plateau: 'PL', Rivers: 'RI', Sokoto: 'SO', Taraba: 'TA', Yobe: 'YO', Zamfara: 'ZA',
};

const leaderOf = (m: Market) => {
  const [a, b] = [...m.outcomes].sort((x, y) => y.price - x.price);
  return !a || (b && a.price - b.price < TIE_MARGIN) ? null : a;
};
const surname = (label: string) => LEADER_SLOTS.find((s) => label.includes(s.match))?.match ?? label.replace(/\s*\(.*\)$/, '').split(' ').slice(-1)[0];

export function StateMap({ markets }: { markets: Market[] }) {
  const byState = new Map(markets.filter((m) => m.state).map((m) => [m.state!, m]));
  const tiles = Object.entries(LAYOUT).map(([state, [c, r]]) => {
    const m = byState.get(state);
    const lead = m ? leaderOf(m) : null;
    const style = { gridColumn: c + 1, gridRow: r + 1, ['--leader' as string]: lead ? leaderColor(lead.label) : 'var(--border)' };
    return m ? (
      <Link key={state} href={`/markets/${m.slug}`} className="tile" style={style} aria-label={`${state}: ${lead ? `${lead.label} leads at ${pct(lead.price)}` : 'no clear leader'}`}>
        <span className="tile-name"><span className="full">{state}</span><abbr className="code" title={state}>{CODE[state]}</abbr></span>
        <span className="tile-lead">{lead ? surname(lead.label) : 'Toss-up'}</span>
        <span className="tile-pct">{lead ? pct(lead.price) : '—'}</span>
      </Link>
    ) : <div key={state} className="tile" style={style}><span className="tile-name"><span className="full">{state}</span><abbr className="code" title={state}>{CODE[state]}</abbr></span><span className="tile-lead muted">No market</span></div>;
  });
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="legend" aria-label="Legend">
        {LEADER_SLOTS.map((s) => <span key={s.match}><i style={{ background: `var(${s.var})` }} />{s.match} leads</span>)}
        <span><i style={{ background: 'var(--series-other)' }} />Another candidate leads</span>
        <span><i style={{ background: 'var(--border)' }} />Toss-up (top two within 2 pts)</span>
      </div>
      <div className="statemap">{tiles}</div>
      <details>
        <summary>Table view</summary>
        <div className="scroll-x">
          <table className="data">
            <thead><tr><th>State</th><th>Leader</th><th className="num">Chance</th><th className="num">Runner-up</th></tr></thead>
            <tbody>
              {Object.keys(LAYOUT).sort().map((s) => {
                const m = byState.get(s);
                const [a, b] = m ? [...m.outcomes].sort((x, y) => y.price - x.price) : [];
                return <tr key={s}><td>{s}</td><td>{a?.label ?? '—'}</td><td className="num">{a ? pct(a.price) : '—'}</td><td className="num">{b ? `${surname(b.label)} ${pct(b.price)}` : '—'}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
