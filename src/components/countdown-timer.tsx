"use client";

import { useState, useEffect } from "react";

/**
 * Countdown Timer Component
 *
 * TIMEZONE NOTE: The endDateTime is expected to be in Mountain Time (America/Boise).
 * This component calculates time remaining by comparing the endDateTime with the
 * user's current local time. The countdown will be accurate for all users regardless
 * of their timezone because:
 * 1. Admin sets endDateTime in MT
 * 2. Backend stores it as UTC timestamp
 * 3. Frontend receives Date object and calculates difference
 * 4. Time remaining is an absolute duration, not timezone-dependent
 */
interface CountdownTimerProps {
  endDateTime: Date;
  onExpired?: () => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(endDate: Date): TimeRemaining {
  const total = endDate.getTime() - new Date().getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

export function CountdownTimer({ endDateTime, onExpired, className }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(endDateTime)
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(endDateTime);
      setTimeRemaining(remaining);

      if (remaining.total <= 0) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDateTime, onExpired, isHydrated]);

  // Prevent hydration mismatch
  if (!isHydrated) {
    return <span className={className}>Loading...</span>;
  }

  if (timeRemaining.total <= 0) {
    return <span className={className}>Expired</span>;
  }

  // Format output based on time remaining
  if (timeRemaining.days > 0) {
    return (
      <span className={className}>
        {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
      </span>
    );
  }

  if (timeRemaining.hours > 0) {
    return (
      <span className={className}>
        {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
      </span>
    );
  }

  return (
    <span className={className}>
      {timeRemaining.minutes}m {timeRemaining.seconds}s
    </span>
  );
}
