'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Register() {
  const { login } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ token: string }>('/auth/register', { method: 'POST', body: Object.fromEntries(f.entries()) });
      await login(r.data.token); router.push('/wallet');
    } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : 'Sign up failed'); setBusy(false); }
  };
  return (
    <form className="card stack" style={{ maxWidth: 420, margin: '24px auto' }} onSubmit={submit}>
      <h1>Create account</h1>
      <label className="field">Full name<input className="input" name="fullName" autoComplete="name" required minLength={2} /></label>
      <label className="field">Email<input className="input" name="email" type="email" autoComplete="email" required /></label>
      <label className="field">Phone<input className="input" name="phone" type="tel" placeholder="0803 123 4567" autoComplete="tel" required /></label>
      <label className="field">Password<input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      {err && <div className="alert error">{err}</div>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      <span className="muted small">18+ only. By signing up you accept the terms. Already have an account? <Link href="/login" style={{ textDecoration: 'underline' }}>Log in</Link></span>
    </form>
  );
}
