"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ComponentIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useSessionStore } from "@/state/session";
import { cn } from "@/lib/utils";
import { useNavStore } from "@/state/nav";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/constants";
import { ROLES_ENUM } from "@/db/schema";
import type { SessionValidationResult } from "@/types";
import { useEffect } from "react";

type NavItem = {
  name: string;
  href: Route;
};

const ActionButtons = ({ currentSession, loading }: { currentSession: SessionValidationResult | null | undefined; loading: boolean }) => {
  const { setIsOpen } = useNavStore();

  if (loading) {
    return <Skeleton className="h-10 w-[80px] bg-primary" />;
  }

  if (currentSession) {
    return null;
  }

  return (
    <Button asChild onClick={() => setIsOpen(false)}>
      <Link href="/sign-in">Sign In</Link>
    </Button>
  );
};

export function Navigation({ initialSession }: { initialSession?: SessionValidationResult }) {
  const { session, isLoading, setSession } = useSessionStore();
  const { isOpen, setIsOpen } = useNavStore();
  const pathname = usePathname();

  // Hydrate store with server-provided session on mount
  useEffect(() => {
    if (initialSession && !session && !isLoading) {
      setSession(initialSession);
    }
  }, [initialSession, session, isLoading, setSession]);

  // Use server session as fallback during initial load
  const currentSession = session ?? initialSession;
  const loading = isLoading && !initialSession;

  const navItems: NavItem[] = [
    { name: "Home", href: "/" },
    ...(currentSession
      ? ([
          { name: "Settings", href: "/settings" },
          ...(currentSession.user.role === ROLES_ENUM.ADMIN
            ? ([{ name: "Admin", href: "/admin" }] as NavItem[])
            : []),
        ] as NavItem[])
      : []),
  ];

  const isActiveLink = (itemHref: string) => {
    if (itemHref === "/") {
      return pathname === "/";
    }
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  };

  return (
    <nav className="dark:bg-muted/30 bg-muted/60 shadow dark:shadow-xl z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2 md:gap-3"
            >
              <ComponentIcon className="w-6 h-6 md:w-7 md:h-7" />
              {SITE_NAME}
            </Link>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-6">
            <div className="flex items-baseline space-x-4">
              {loading ? (
                <>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </>
              ) : (
                navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-foreground no-underline px-3 h-16 flex items-center text-sm font-medium transition-colors relative",
                      isActiveLink(item.href) &&
                        "text-foreground after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:bg-foreground"
                    )}
                  >
                    {item.name}
                  </Link>
                ))
              )}
            </div>
            <ActionButtons currentSession={currentSession} loading={loading} />
          </div>
          <div className="md:hidden flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] px-6">
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </VisuallyHidden>
                <div className="mt-8 flow-root">
                  <div className="space-y-1">
                    {loading ? (
                      <>
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                      </>
                    ) : (
                      <>
                        {navItems.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 no-underline transition-colors rounded-md",
                              isActiveLink(item.href) && "text-foreground bg-muted/50"
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ))}
                        <div className="pt-6">
                          <ActionButtons currentSession={currentSession} loading={loading} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
