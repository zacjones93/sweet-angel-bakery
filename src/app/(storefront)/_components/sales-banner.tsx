"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import Link from "next/link";
import type { SalesBanner as SalesBannerType } from "@/db/schema";

interface SalesBannerProps {
  banner: SalesBannerType;
}

export function SalesBanner({ banner }: SalesBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    // Check if banner was dismissed
    if (banner.isDismissible === 1) {
      const dismissedKey = `dismissed-banner-${banner.id}`;
      const dismissed = localStorage.getItem(dismissedKey);
      if (dismissed) {
        setIsDismissed(true);
      }
    }
  }, [banner.id, banner.isDismissible]);

  const handleDismiss = () => {
    if (banner.isDismissible === 1) {
      const dismissedKey = `dismissed-banner-${banner.id}`;
      localStorage.setItem(dismissedKey, "true");
      setIsDismissed(true);
    }
  };

  const handleExpired = () => {
    setIsDismissed(true);
  };

  // Don't render until hydrated to prevent SSR mismatch
  if (!isHydrated || isDismissed) {
    return null;
  }

  return (
    <div
      className="w-full shadow-sm"
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor,
      }}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Scrolling message on mobile, static on desktop */}
          <div className="flex-1 overflow-hidden">
            <div className="md:text-center">
              <span className="text-sm font-medium inline-block animate-marquee md:animate-none whitespace-nowrap md:whitespace-normal">
                {banner.message}
              </span>
            </div>
          </div>

          {/* Countdown timer */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-black/20 rounded">
              <span className="text-xs font-medium">Ends in:</span>
              <CountdownTimer
                endDateTime={new Date(banner.endDateTime)}
                onExpired={handleExpired}
                className="font-mono font-bold text-xs"
              />
            </div>

            {/* CTA Button */}
            {banner.ctaText && banner.ctaLink && (
              <Link
                href={banner.ctaLink}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-900 rounded text-xs font-medium transition-colors"
              >
                {banner.ctaText}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}

            {/* Dismiss button */}
            {banner.isDismissible === 1 && (
              <button
                onClick={handleDismiss}
                className="p-0.5 hover:bg-white/20 rounded transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile-only countdown and CTA */}
        <div className="sm:hidden mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded text-xs">
            <span className="font-medium">Ends:</span>
            <CountdownTimer
              endDateTime={new Date(banner.endDateTime)}
              onExpired={handleExpired}
              className="font-mono font-bold text-xs"
            />
          </div>
          {banner.ctaText && banner.ctaLink && (
            <Link
              href={banner.ctaLink}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-white/90 text-gray-900 rounded text-xs font-medium"
            >
              {banner.ctaText}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 20s linear infinite;
        }

        @media (min-width: 768px) {
          .animate-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
