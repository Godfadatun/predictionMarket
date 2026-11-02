import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Nav } from '@/components/Nav';

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? 'Predict Naija';

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: 'Trade on Nigerian elections, music charts and more. Prices are the crowd’s live odds.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#00703c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <AuthProvider>
          <Nav appName={APP} />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
