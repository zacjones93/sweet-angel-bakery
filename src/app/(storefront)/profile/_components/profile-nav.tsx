"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShoppingBag, Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "../_actions/logout.action";
import { useServerAction } from "zsa-react";

const navItems = [
  {
    title: "Orders",
    href: "/profile",
    icon: ShoppingBag,
  },
  {
    title: "Notifications",
    href: "/profile/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    href: "/profile/settings",
    icon: User,
  },
];

export function ProfileNav() {
  const pathname = usePathname();
  const { execute, isPending } = useServerAction(logoutAction);

  async function handleLogout() {
    await execute({});
    window.location.href = "/";
  }

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-sm font-medium"
        onClick={handleLogout}
        disabled={isPending}
      >
        <LogOut className="h-4 w-4" />
        {isPending ? "Logging out..." : "Logout"}
      </Button>
    </nav>
  );
}
