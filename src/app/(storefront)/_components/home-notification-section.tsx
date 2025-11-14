import { getActiveHomeNotificationAction } from "../_actions/site-content.action";
import Image from "next/image";
import { InfoIcon } from "lucide-react";

export async function HomeNotificationSection() {
  const [notification] = await getActiveHomeNotificationAction();

  if (!notification) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-b from-bakery-pink/20 to-transparent">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-bakery-pink/20 rounded-lg p-6 shadow-sm">
            <div className="flex gap-6 items-start">
              {notification.imageUrl && (
                <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={notification.imageUrl}
                    alt={notification.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <InfoIcon className="h-6 w-6 text-bakery-pink flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {notification.title}
                    </h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
