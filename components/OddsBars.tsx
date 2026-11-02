import { Outcome } from '@/lib/api';
import { pct, sharePrice } from '@/lib/format';

// Single series (implied probability per outcome): one hue, sorted high→low, value + label in ink on every row.
export function OddsBars({ outcomes, limit, onPick }: { outcomes: Outcome[]; limit?: number; onPick?: (o: Outcome) => void }) {
  const sorted = [...outcomes].sort((a, b) => b.price - a.price);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <div className="odds" role="list">
      {shown.map((o) => (
        <div key={o.id} className="odds-row" role="listitem">
          <span className="odds-label">{o.label}</span>
          <span className="odds-value">{pct(o.price)}</span>
          <div className="odds-track" aria-hidden><div className="odds-fill" style={{ width: `${Math.max(o.price * 100, 0.5)}%` }} /></div>
          <span className="tip" role="tooltip">{o.label}: {pct(o.price)} · {sharePrice(o.price)} per share · pays ₦100 if right</span>
          {onPick && <button className="odds-hit" aria-label={`Trade ${o.label}, ${pct(o.price)}`} onClick={() => onPick(o)} />}
        </div>
      ))}
      {limit && sorted.length > limit && <span className="muted small">+{sorted.length - limit} more</span>}
    </div>
  );
}
