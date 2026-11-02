'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email: f.get('email'), password: f.get('password') } });
      await login(r.data.token); router.push('/');
    } catch (e2) { setErr(e2 instanceof ApiError ? e2.message : 'Login failed'); setBusy(false); }
  };
  return (
    <form className="card stack" style={{ maxWidth: 420, margin: '24px auto' }} onSubmit={submit}>
      <h1>Log in</h1>
      <label className="field">Email<input className="input" name="email" type="email" autoComplete="email" required /></label>
      <label className="field">Password<input className="input" name="password" type="password" autoComplete="current-password" required /></label>
      {err && <div className="alert error">{err}</div>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <span className="muted small">New here? <Link href="/register" style={{ textDecoration: 'underline' }}>Create an account</Link></span>
    </form>
  );
}
