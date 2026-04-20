import { RecurringTransaction } from "../types";

export interface RecurringOccurrence {
  _id: string; // Unique ID for keying: itemID_dateString
  item: RecurringTransaction;
  occurrenceDate: Date;
}

/**
 * Calculates all instances of a recurring transaction within a given period.
 * 
 * @param item The recurring transaction rule
 * @param startPeriod The start of the window (inclusive)
 * @param endPeriod The end of the window (inclusive)
 * @returns An array of occurrence objects with calculated dates
 */
export function getOccurrencesInPeriod(
  item: RecurringTransaction,
  startPeriod: Date,
  endPeriod: Date
): RecurringOccurrence[] {
  const occurrences: RecurringOccurrence[] = [];
  const start = new Date(item.startDate);
  const end = item.endDate ? new Date(item.endDate) : null;

  // Normalize clocks for accurate day-to-day comparison
  start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  const pStart = new Date(startPeriod);
  pStart.setHours(0, 0, 0, 0);

  const pEnd = new Date(endPeriod);
  pEnd.setHours(23, 59, 59, 999);

  // If item hasn't started yet relative to the end of the period, or ended before the start
  if (start > pEnd) return [];
  if (end && end < pStart) return [];

  const addOccurrenceIfInRange = (date: Date) => {
    // Must be within the user-selected period AND within the item's validity range
    if (date >= pStart && date <= pEnd && date >= start && (!end || date <= end)) {
      occurrences.push({
        _id: `${item._id}_${date.toISOString()}`,
        item: item,
        occurrenceDate: new Date(date),
      });
    }
  };

  // Naive but robust: start from item start and skip to period end
  let runner = new Date(start);

  if (item.frequency === "daily") {
    // Optimization: Skip to period start if it's much later
    if (pStart > runner) {
      runner = new Date(pStart);
    }
    while (runner <= pEnd && (!end || runner <= end)) {
      addOccurrenceIfInRange(runner);
      runner.setDate(runner.getDate() + 1);
    }
  } else if (item.frequency === "weekly") {
    while (runner <= pEnd && (!end || runner <= end)) {
      addOccurrenceIfInRange(runner);
      runner.setDate(runner.getDate() + 7);
    }
  } else if (item.frequency === "monthly") {
    while (runner <= pEnd && (!end || runner <= end)) {
      addOccurrenceIfInRange(runner);
      runner.setMonth(runner.getMonth() + 1);
    }
  } else if (item.frequency === "yearly") {
    while (runner <= pEnd && (!end || runner <= end)) {
      addOccurrenceIfInRange(runner);
      runner.setFullYear(runner.getFullYear() + 1);
    }
  }

  return occurrences;
}
