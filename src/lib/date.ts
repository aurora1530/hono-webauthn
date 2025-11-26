export const formatUtcDateTime = (date: Date, timeZone: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone,
  };

  const formatter = new Intl.DateTimeFormat("ja-JP", options);
  return formatter.format(date);
};
