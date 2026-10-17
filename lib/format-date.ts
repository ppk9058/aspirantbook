export function formatIstDateTime(
  isoStringOrDate: string | Date | null | undefined
): string {
  if (!isoStringOrDate) return "—";
  const date =
    typeof isoStringOrDate === "string"
      ? new Date(isoStringOrDate)
      : isoStringOrDate;
  if (!date || isNaN(date.getTime())) return "—";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}
