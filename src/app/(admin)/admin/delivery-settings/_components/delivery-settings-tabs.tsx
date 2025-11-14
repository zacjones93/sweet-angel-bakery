"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliverySchedulesTable } from "./delivery-schedules-table";
import { PickupLocationsTable } from "./pickup-locations-table";
import { DeliveryZonesTable } from "./delivery-zones-table";
import { CalendarClosuresTable } from "./calendar-closures-table";
import { OneOffDatesTable } from "./one-off-dates-table";
import type { DeliverySchedule, PickupLocation, DeliveryZone, DeliveryCalendarClosure, DeliveryOneOffDate } from "@/db/schema";

interface LocationWithParsedData extends Omit<PickupLocation, 'address' | 'pickupDays'> {
  address: { street: string; city: string; state: string; zip: string };
  pickupDays: number[];
}

interface ZoneWithParsedData extends Omit<DeliveryZone, 'zipCodes'> {
  zipCodes: string[];
}

interface DeliverySettingsTabsProps {
  initialSchedules: DeliverySchedule[];
  initialLocations: LocationWithParsedData[];
  initialZones: ZoneWithParsedData[];
  initialClosures: DeliveryCalendarClosure[];
  initialOneOffDates: DeliveryOneOffDate[];
}

export function DeliverySettingsTabs({
  initialSchedules,
  initialLocations,
  initialZones,
  initialClosures,
  initialOneOffDates,
}: DeliverySettingsTabsProps) {
  return (
    <Tabs defaultValue="schedules" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="schedules">Delivery Schedules</TabsTrigger>
        <TabsTrigger value="locations">Pickup Locations</TabsTrigger>
        <TabsTrigger value="zones">Delivery Zones</TabsTrigger>
        <TabsTrigger value="closures">Calendar Closures</TabsTrigger>
        <TabsTrigger value="one-off">One-Off Dates</TabsTrigger>
      </TabsList>

      <TabsContent value="schedules" className="mt-6">
        <DeliverySchedulesTable schedules={initialSchedules} />
      </TabsContent>

      <TabsContent value="locations" className="mt-6">
        <PickupLocationsTable locations={initialLocations} />
      </TabsContent>

      <TabsContent value="zones" className="mt-6">
        <DeliveryZonesTable zones={initialZones} />
      </TabsContent>

      <TabsContent value="closures" className="mt-6">
        <CalendarClosuresTable closures={initialClosures} />
      </TabsContent>

      <TabsContent value="one-off" className="mt-6">
        <OneOffDatesTable oneOffDates={initialOneOffDates} />
      </TabsContent>
    </Tabs>
  );
}
