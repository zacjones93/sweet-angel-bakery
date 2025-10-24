import { getDeliverySchedulesAction } from "../_actions/delivery-schedule.action";
import { getPickupLocationsAction } from "../_actions/pickup-location.action";
import { getDeliveryZonesAction } from "../_actions/delivery-zone.action";
import { DeliverySettingsTabs } from "./_components/delivery-settings-tabs";

export const metadata = {
  title: "Delivery Settings | Admin",
  description: "Configure delivery schedules, pickup locations, and delivery zones",
};

export default async function DeliverySettingsPage() {
  // Fetch all data in parallel
  const [schedules, locations, zones] = await Promise.all([
    getDeliverySchedulesAction().then(([data]) => data || []),
    getPickupLocationsAction().then(([data]) => data || []),
    getDeliveryZonesAction().then(([data]) => data || []),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Delivery Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure delivery schedules, pickup locations, and delivery zones
        </p>
      </div>

      <DeliverySettingsTabs
        initialSchedules={schedules}
        initialLocations={locations}
        initialZones={zones}
      />
    </div>
  );
}
