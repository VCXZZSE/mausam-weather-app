export type TimeGreeting = "Good morning" | "Good afternoon" | "Good evening" | "Good night"

/** Returns a natural greeting using the selected location's local hour. */
export function getTimeGreeting(
  now: Date,
  timeZone = "Asia/Kolkata",
): TimeGreeting {
  let hour: number
  try {
    const hourPart = new Intl.DateTimeFormat("en-IN", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value
    hour = Number(hourPart)
    if (!Number.isInteger(hour)) throw new Error("Unable to resolve local hour")
  } catch {
    hour = now.getHours()
  }

  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  if (hour >= 17 && hour < 22) return "Good evening"
  return "Good night"
}
