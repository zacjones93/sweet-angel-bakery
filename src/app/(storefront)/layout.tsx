import { StorefrontNav } from "./_components/storefront-nav";
import { SalesBanner } from "./_components/sales-banner";
import { CartProvider } from "@/state/cart-context";
import { getActiveSalesBannerAction } from "./_actions/site-content.action";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeBanner] = await getActiveSalesBannerAction();

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        {activeBanner && <SalesBanner banner={activeBanner} />}
        <StorefrontNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-12 mt-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Sweet Angel Bakery. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
