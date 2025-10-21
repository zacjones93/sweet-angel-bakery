import { redirect } from "next/navigation";
import { getCurrentLoyaltyCustomer } from "./_lib/get-loyalty-customer";
import { ProfileNav } from "./_components/profile-nav";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getCurrentLoyaltyCustomer();

  if (!customer) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">
          Welcome back, {customer.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Manage your orders and loyalty preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <ProfileNav />
        </aside>

        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  );
}
