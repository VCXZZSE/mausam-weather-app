import type { CpcbRecord } from "../src/providers/cpcbClient.js"

export function cpcbRecords(overrides: Partial<CpcbRecord>={}): CpcbRecord[] {
  const local=new Date(Date.now()+19800000).toISOString()
  const updated=`${local.slice(8,10)}-${local.slice(5,7)}-${local.slice(0,4)} ${local.slice(11,19)}`
  return [["PM2.5","78"],["PM10","68"],["NO2","22"]].map(([pollutant_id,pollutant_avg]) => ({
    country: "India",state: "West Bengal",city: "Kolkata",
    station: "Rabindra Bharati University, Kolkata - WBPCB",
    latitude: "22.627",longitude: "88.3806",last_update: updated,
    pollutant_id,pollutant_avg,...overrides,
  }))
}
export function cpcbBody() { return { records: cpcbRecords() } }
