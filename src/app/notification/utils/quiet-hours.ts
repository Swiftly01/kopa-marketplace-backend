export function computeQuietHoursDelayMs(
  quietHoursStart: string | null,
  quietHoursEnd: string | null,
  timeZone: string,
  now: Date = new Date(),
) {
  if (!quietHoursStart || !quietHoursEnd) return 0;

  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timeZone }));

  const minutesNow = nowInTz.getHours() * 60 + nowInTz.getMinutes();
  const startMinutes = toMinutes(quietHoursStart);
  const endMinutes = toMinutes(quietHoursEnd);

  const isQuiet =
    startMinutes <= endMinutes
      ? minutesNow >= startMinutes && minutesNow < endMinutes
      : minutesNow >= startMinutes || minutesNow < endMinutes;

  if (!isQuiet) return 0;

  const minutesUntilEnd =
    endMinutes > minutesNow
      ? endMinutes - minutesNow
      : 24 * 60 - minutesNow + endMinutes;

  return minutesUntilEnd * 60 * 1000;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
