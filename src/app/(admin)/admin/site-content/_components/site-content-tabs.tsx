"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeNotificationsTable } from "./home-notifications-table";
import { SalesBannerForm } from "./sales-banner-form";
import type { HomeNotification, SalesBanner } from "@/db/schema";

interface SiteContentTabsProps {
  initialNotifications: HomeNotification[];
  initialBanner: SalesBanner | null;
}

export function SiteContentTabs({
  initialNotifications,
  initialBanner,
}: SiteContentTabsProps) {
  return (
    <Tabs defaultValue="notifications" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="notifications">Home Notifications</TabsTrigger>
        <TabsTrigger value="banner">Sales Banner</TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="mt-6">
        <HomeNotificationsTable notifications={initialNotifications} />
      </TabsContent>

      <TabsContent value="banner" className="mt-6">
        <SalesBannerForm initialBanner={initialBanner} />
      </TabsContent>
    </Tabs>
  );
}
