"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliverySchedulesTable } from "./delivery-schedules-table";
import { PickupLocationsTable } from "./pickup-locations-table";
import { DeliveryZonesTable } from "./delivery-zones-table";
import type { DeliverySchedule, PickupLocation, DeliveryZone } from "@/db/schema";

interface DeliverySettingsTabsProps {
  initialSchedules: DeliverySchedule[];
  initialLocations: any[]; // With parsed JSON
  initialZones: any[]; // With parsed JSON
}

export function DeliverySettingsTabs({
  initialSchedules,
  initialLocations,
  initialZones,
}: DeliverySettingsTabsProps) {
  return (
    <Tabs defaultValue="schedules" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="schedules">Delivery Schedules</TabsTrigger>
        <TabsTrigger value="locations">Pickup Locations</TabsTrigger>
        <TabsTrigger value="zones">Delivery Zones</TabsTrigger>
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
    </Tabs>
  );
}
