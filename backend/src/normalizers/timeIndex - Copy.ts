export function findClosestTimeIndex(
  times: string[],
  targetTime: string,
): number {
  const exact = times.indexOf(targetTime)
  if (exact !== -1) return exact

  const target = new Date(targetTime).getTime()
  let closestIndex = 0
  let closestDiff = Infinity
  times.forEach((time, index) => {
    const diff = Math.abs(new Date(time).getTime() - target)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = index
    }
  })
  return closestIndex
}
