import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/utils/auth";
import { ROLES_ENUM } from "@/db/schema";
import { ManualOrderForm } from "./_components/manual-order-form";
import { getProductsForManualOrderAction, getPickupLocationsAction } from "../../_actions/create-manual-order.action";
import { getDeliveryZonesAction } from "../../_actions/delivery-zone.action";

export const metadata = {
  title: "Create Order | Admin",
  description: "Create a new manual order",
};

export default async function NewOrderPage() {
  const session = await getSessionFromCookie();

  if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
    redirect("/admin");
  }

  // Fetch data in parallel
  const [productsResult, pickupLocationsResult, deliveryZonesResult] =
    await Promise.all([
      getProductsForManualOrderAction(),
      getPickupLocationsAction(),
      getDeliveryZonesAction(),
    ]);

  const [products] = productsResult;
  const [pickupLocations] = pickupLocationsResult;
  const [deliveryZones] = deliveryZonesResult;

  if (!products || !pickupLocations || !deliveryZones) {
    return (
      <div className="container py-8">
        <p className="text-destructive">Failed to load required data</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Manual Order</h1>
        <p className="text-muted-foreground mt-2">
          Create an order for cash, check, or external payments
        </p>
      </div>

      <ManualOrderForm
        products={products}
        pickupLocations={pickupLocations}
        deliveryZones={deliveryZones}
      />
    </div>
  );
}
