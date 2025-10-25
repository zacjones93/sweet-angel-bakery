import { Footer } from '@/components/footer';
import { Navigation } from '@/components/navigation';
import { getSessionFromCookie } from '@/utils/auth';

export default async function NavFooterLayout({
  children,
  renderFooter = true,
}: Readonly<{
  children: React.ReactNode;
  renderFooter?: boolean;
}>) {
  const session = await getSessionFromCookie();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation initialSession={session} />
      <main className="flex-1">
        {children}
      </main>
      {renderFooter && <Footer />}
    </div>
  );
}
