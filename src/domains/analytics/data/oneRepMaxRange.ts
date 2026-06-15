export type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

interface WorkoutDatePoint {
  workout_date: string;
}

const addCalendarMonths = (date: Date, months: number): Date => {
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDayOfTargetMonth)
    )
  );
};

export const getAutomaticTimeRange = (
  history: readonly WorkoutDatePoint[]
): TimeRange => {
  const timestamps = history
    .map(point => Date.parse(point.workout_date))
    .filter(timestamp => Number.isFinite(timestamp))
    .sort((left, right) => left - right);

  if (timestamps.length < 2) {
    return "ALL";
  }

  const earliest = new Date(timestamps[0]);
  const latest = timestamps[timestamps.length - 1];
  const threeMonthBoundary = addCalendarMonths(earliest, 3).getTime();

  return latest > threeMonthBoundary ? "3M" : "ALL";
};
