import { StorefrontNav } from "./_components/storefront-nav";
import { CartProvider } from "@/state/cart-context";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
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
