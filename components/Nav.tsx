'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { naira } from '@/lib/format';

const LINKS = [
  { href: '/', label: 'Markets' },
  { href: '/states', label: 'State map' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/wallet', label: 'Wallet' },
];

export function Nav({ appName }: { appName: string }) {
  const path = usePathname();
  const { user, balanceKobo, ready, logout } = useAuth();
  const links = user?.role === 'ADMIN' ? [...LINKS, { href: '/admin', label: 'Admin' }] : LINKS;
  const linkEls = links.map((l) => (
    <Link key={l.href} href={l.href} className={path === l.href ? 'active' : undefined}>{l.label}</Link>
  ));
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden />{appName}</Link>
          <nav className="nav-links" aria-label="Main">{linkEls}</nav>
          <div className="nav-right">
            {ready && user && <Link href="/wallet" className="pill num" title="Wallet balance">{naira(balanceKobo ?? 0)}</Link>}
            {ready && user && <button className="btn" onClick={() => void logout()}>Log out</button>}
            {ready && !user && <Link className="btn" href="/login">Log in</Link>}
            {ready && !user && <Link className="btn primary" href="/register">Sign up</Link>}
          </div>
        </div>
      </header>
      <div className="subnav"><nav className="container nav-links" aria-label="Main (mobile)">{linkEls}</nav></div>
    </>
  );
}
