/**
 * Utility functions for Demo Slot scheduling, UTC-to-IST conversion,
 * countdown timers, and E.164 phone normalization.
 */

export function normalizePhoneToE164(input: string): string | null {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 10) {
    return `+91${digits}`
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`
  }
  if (digits.length === 13 && digits.startsWith("091")) {
    return `+${digits.slice(1)}`
  }
  return null
}

export function formatUtcToIst(utcDate: Date | string): {
  dateLabel: string
  timeLabel: string
  fullLabel: string
  isToday: boolean
  isTomorrow: boolean
} {
  const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate

  // Format in Asia/Kolkata timezone
  const istString = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  const istDate = new Date(istString)

  const nowIstString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  const nowIst = new Date(nowIstString)

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  const tomorrowIst = new Date(nowIst)
  tomorrowIst.setDate(tomorrowIst.getDate() + 1)

  const isToday = isSameDay(istDate, nowIst)
  const isTomorrow = isSameDay(istDate, tomorrowIst)

  // Time in 12-hour format e.g. "6:00 PM IST"
  const timeLabel = d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase()

  let dateLabel = ""
  if (isToday) {
    dateLabel = "Today"
  } else if (isTomorrow) {
    dateLabel = "Tomorrow"
  } else {
    dateLabel = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  const fullLabel = `${dateLabel}, ${timeLabel} IST`

  return {
    dateLabel,
    timeLabel: `${timeLabel} IST`,
    fullLabel,
    isToday,
    isTomorrow,
  }
}

export function isSlotExpired(startTime: Date | string, durationMinutes = 60): boolean {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return end < new Date()
}
