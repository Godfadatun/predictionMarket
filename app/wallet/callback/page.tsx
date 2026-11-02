'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { naira } from '@/lib/format';

function Verify() {
  const params = useSearchParams();
  const ref = params.get('reference') ?? params.get('trxref');
  const { refresh } = useAuth();
  const [state, setState] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (!ref || ran.current) return;
    ran.current = true;
    api<{ status: string; amountKobo: number }>(`/wallet/deposits/${ref}/verify`, { method: 'POST' })
      .then(async (r) => {
        await refresh();
        setState(r.data.status === 'SUCCESS' ? { kind: 'ok', text: `${naira(r.data.amountKobo)} added to your wallet.` }
          : { kind: 'warn', text: 'Payment not completed yet. If you were charged, your wallet updates automatically within a few minutes.' });
      })
      .catch((e) => setState({ kind: e instanceof ApiError && e.code === 'ALREADY_PROCESSED' ? 'ok' : 'error', text: e instanceof ApiError && e.code === 'ALREADY_PROCESSED' ? 'This payment is already in your wallet.' : e instanceof ApiError ? e.message : 'Verification failed' }));
  }, [ref, refresh]);
  if (!ref) return <div className="alert error">Missing payment reference.</div>;
  return (
    <div className="card stack" style={{ maxWidth: 480 }}>
      <h1>Confirming payment</h1>
      {state ? <div className={`alert ${state.kind}`}>{state.text}</div> : <p className="muted">Checking with Paystack…</p>}
      <Link className="btn" href="/wallet">Back to wallet</Link>
    </div>
  );
}

export default function Callback() {
  return <Suspense fallback={<div className="skeleton" />}><Verify /></Suspense>;
}
