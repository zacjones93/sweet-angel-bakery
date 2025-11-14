import { listHomeNotificationsAction } from "./_actions/home-notifications.action";
import { getSalesBannerAction } from "./_actions/sales-banner.action";
import { SiteContentTabs } from "./_components/site-content-tabs";

export const metadata = {
  title: "Site Content | Admin",
  description: "Manage home notifications and sales banners",
};

export default async function SiteContentPage() {
  // Fetch data in parallel
  const [notifications, banner] = await Promise.all([
    listHomeNotificationsAction().then(([data]) => data || []),
    getSalesBannerAction().then(([data]) => data || null),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Site Content</h1>
        <p className="text-muted-foreground mt-1">
          Manage home page notifications and sales banners
        </p>
      </div>

      <SiteContentTabs
        initialNotifications={notifications}
        initialBanner={banner}
      />
    </div>
  );
}
