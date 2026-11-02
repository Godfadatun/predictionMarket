import Link from 'next/link';
import { Market } from '@/lib/api';
import { timeLeft } from '@/lib/format';
import { OddsBars } from './OddsBars';

export function MarketCard({ m }: { m: Market }) {
  const open = m.status === 'OPEN' && new Date(m.closesAt).getTime() > Date.now();
  return (
    <Link href={`/markets/${m.slug}`} className="card card-link stack" style={{ gap: 12 }}>
      <div className="spread">
        <span className={`pill ${open ? 'open' : ''}`}>{open ? timeLeft(m.closesAt) : m.status.replace('_', ' ').toLowerCase()}</span>
        {m.state && <span className="pill">{m.state}</span>}
      </div>
      <h3>{m.title}</h3>
      <OddsBars outcomes={m.outcomes} limit={3} />
    </Link>
  );
}
