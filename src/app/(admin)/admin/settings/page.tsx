import { getAdminNotificationPreferencesAction } from "./_actions/admin-settings.action";
import { AdminNotificationSettings } from "./_components/admin-notification-settings";

export const metadata = {
  title: "Admin Settings",
  description: "Configure admin preferences and notifications",
};

export default async function AdminSettingsPage() {
  const [preferences] = await getAdminNotificationPreferencesAction();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your admin preferences and notifications
        </p>
      </div>

      <AdminNotificationSettings
        initialPreferences={preferences || { emailNewOrders: true, newOrderEmailAddress: null }}
      />
    </div>
  );
}
