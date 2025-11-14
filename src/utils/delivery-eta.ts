import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { BUSINESS_TIMEZONE, toMountainTime, getMountainISODate } from './timezone';

/**
 * Generalizes an estimated arrival time into a customer-friendly message
 * All calculations done in Mountain Time
 */
export function generalizeDeliveryETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  const now = toMountainTime(new Date());
  const today = getMountainISODate(now);

  if (!estimatedArrivalTime) {
    if (deliveryDate === today) {
      return 'Today';
    }
    const deliveryMT = toZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);
    return `On ${format(deliveryMT, 'EEEE, MMMM d')}`;
  }

  // Parse the estimated arrival datetime in MT
  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const deliveryDateObj = parseISO(deliveryDate);
  const estimatedArrival = toZonedTime(deliveryDateObj, BUSINESS_TIMEZONE);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  if (deliveryDate !== today) {
    const startTime = format(estimatedArrival, 'h:mm a');
    const endTime = format(addMinutes(estimatedArrival, 60), 'h:mm a');
    return `${format(estimatedArrival, 'EEEE, MMMM d')} between ${startTime} - ${endTime}`;
  }

  const minutesUntilArrival = differenceInMinutes(estimatedArrival, now);

  if (minutesUntilArrival <= 60) {
    return 'Within the hour';
  }

  const startHour = format(estimatedArrival, 'h a');
  const endHour = format(addMinutes(estimatedArrival, 60), 'h a');

  return `Today between ${startHour} - ${endHour}`;
}

export function getDetailedETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  const deliveryMT = utcToZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);

  if (!estimatedArrivalTime) {
    return format(deliveryMT, 'EEEE, MMMM d');
  }

  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const estimatedArrival = toZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  const today = getMountainISODate(toMountainTime(new Date()));

  if (deliveryDate === today) {
    return `Today at ${format(estimatedArrival, 'h:mm a')}`;
  }

  return `${format(estimatedArrival, 'EEEE, MMMM d')} at ${format(estimatedArrival, 'h:mm a')}`;
}
