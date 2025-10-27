import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';

/**
 * Generalizes an estimated arrival time into a customer-friendly message
 *
 * @param estimatedArrivalTime - Time string in "HH:mm:ss" format (e.g., "14:30:00")
 * @param deliveryDate - ISO date string (e.g., "2024-10-26")
 * @returns Generalized ETA message
 *
 * Examples:
 * - "Within the hour" (if ETA is < 60 minutes from now)
 * - "Today between 2-3 PM" (if ETA is today)
 * - "Today" (if no specific time available)
 */
export function generalizeDeliveryETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  // If no estimated arrival time, just say "Today"
  if (!estimatedArrivalTime) {
    if (deliveryDate === today) {
      return 'Today';
    }
    return `On ${format(parseISO(deliveryDate), 'EEEE, MMMM d')}`;
  }

  // Parse the estimated arrival datetime
  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const estimatedArrival = parseISO(deliveryDate);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  // Check if delivery is today
  if (deliveryDate !== today) {
    // Future date - give date with time window
    const startTime = format(estimatedArrival, 'h:mm a');
    const endTime = format(addMinutes(estimatedArrival, 60), 'h:mm a');
    return `${format(parseISO(deliveryDate), 'EEEE, MMMM d')} between ${startTime} - ${endTime}`;
  }

  // Calculate minutes until arrival
  const minutesUntilArrival = differenceInMinutes(estimatedArrival, now);

  // If arrival is in the past or within 60 minutes
  if (minutesUntilArrival <= 60) {
    return 'Within the hour';
  }

  // If arrival is today but more than 1 hour away, give a time window
  const startHour = format(estimatedArrival, 'h a');
  const endHour = format(addMinutes(estimatedArrival, 60), 'h a');

  return `Today between ${startHour} - ${endHour}`;
}

/**
 * Gets a more detailed ETA message for display in admin view
 */
export function getDetailedETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  if (!estimatedArrivalTime) {
    return format(parseISO(deliveryDate), 'EEEE, MMMM d');
  }

  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const estimatedArrival = parseISO(deliveryDate);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  const today = format(new Date(), 'yyyy-MM-dd');

  if (deliveryDate === today) {
    return `Today at ${format(estimatedArrival, 'h:mm a')}`;
  }

  return `${format(parseISO(deliveryDate), 'EEEE, MMMM d')} at ${format(estimatedArrival, 'h:mm a')}`;
}
