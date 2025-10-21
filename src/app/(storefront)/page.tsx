import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStorefrontProductsAction } from "./_actions/storefront.action";
import { ProductCard } from "./_components/product-card";

export default async function HomePage() {
  const [products] = await getStorefrontProductsAction({ featured: true });

  return (
    <div className="min-h-screen">
      {/* Hero Section - Simple and Clean like Hudson's */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-12 text-balance">
            <span className="font-sans text-lg md:text-2xl text-muted-foreground block mb-6">
              Welcome to
            </span>
            <span className="font-script text-bakery-pink block mb-4 py-10">
              Sweet Angel
            </span>
            <span className="font-display text-bakery-blue block uppercase pt-4">
              Bakery
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Handcrafted cakes and cookies made with love, using the finest
            ingredients. Order online for pickup today.
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6">
            <Link href="/">View Menu</Link>
          </Button>
        </div>
      </section>

      {/* Loyalty Program Section */}
      <section className="py-20 bg-gradient-to-b from-bakery-pink/10 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Join Our Loyalty Program
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Get exclusive perks when you place your first order
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bakery-pink/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Early Access to Drops
                    </h3>
                    <p className="text-muted-foreground">
                      Get 24 hours early access to new product drops before the
                      public
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bakery-blue/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Order Tracking & History
                    </h3>
                    <p className="text-muted-foreground">
                      View all your past orders and track current ones in one
                      place
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bakery-pink/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      New Product Alerts
                    </h3>
                    <p className="text-muted-foreground">
                      Be the first to know when we launch new treats and
                      seasonal specials
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bakery-blue/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      SMS Updates (Optional)
                    </h3>
                    <p className="text-muted-foreground">
                      Get text notifications about your orders and special drops
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="/signup">Join Now</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-lg px-8"
                >
                  <Link href="/login">Already a Member? Login</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Joining is free and automatic when you place your first order
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Category Section */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12 text-center">
            Cookies, Cakes & More!
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
            Take a peek at our menu and discover an array of irresistible
            treats.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Button
              size="lg"
              variant="default"
              asChild
              className="text-lg px-8"
            >
              <Link href="/products/cakes">View Cakes</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-lg px-8"
            >
              <Link href="/products/cookies">View Cookies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products && products.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-12 text-center">
              Featured Treats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Button size="lg" variant="outline" asChild>
                <Link href="/">Browse All Products</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Visit Us Section */}
      {/* <section className="py-20 bg-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Visit Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Renowned for our delectably large cookies and beautiful custom cakes
            – let us be your ultimate dessert experience.
          </p>
        </div>
      </section> */}
    </div>
  );
}
