import { describe,expect,it } from "vitest"
import { normalizeCpcbAirQuality,stationUpdateTime } from "../src/normalizers/cpcbAqi.js"
import { cpcbRecords } from "./cpcbFixtures.js"

const KOLKATA={ latitude: 22.5726,longitude: 88.3639 }

describe("normalizeCpcbAirQuality",() => {
  it("uses the largest published sub-index without applying concentration breakpoints again",() => {
    const result=normalizeCpcbAirQuality(cpcbRecords(),KOLKATA,50)
    expect(result).toMatchObject({ index: 78,label: "Satisfactory",standard: "IN_NAQI",source: "CPCB" })
    expect(result?.pollutants).toHaveLength(3)
    expect(result?.pollutants.every(p => p.unit==="AQI sub-index")).toBe(true)
  })

  it.each([[50,"Good"],[51,"Satisfactory"],[100,"Satisfactory"],[101,"Moderate"],[200,"Moderate"],[201,"Poor"],[300,"Poor"],[301,"Very Poor"],[400,"Very Poor"],[401,"Severe"]])("labels AQI %s as %s",(index,label) => {
    expect(normalizeCpcbAirQuality(cpcbRecords({ pollutant_avg: String(index) }),KOLKATA,50)?.label).toBe(label)
  })

  it("requires three distinct pollutants including particulate matter",() => {
    expect(normalizeCpcbAirQuality(cpcbRecords().slice(0,2),KOLKATA,50)).toBeUndefined()
    const gases=cpcbRecords().map((r,i) => ({ ...r,pollutant_id: ["NO2","CO","SO2"][i] }))
    expect(normalizeCpcbAirQuality(gases,KOLKATA,50)).toBeUndefined()
  })

  it("selects the nearest usable station and does not mix stations or timestamps",() => {
    const near=cpcbRecords({ station: "Near",latitude: "22.58",longitude: "88.37" })
    const far=cpcbRecords({ station: "Far" })
    expect(normalizeCpcbAirQuality([...far,...near],KOLKATA,50)?.stationName).toBe("Near")
    expect(normalizeCpcbAirQuality([...far,...near.slice(0,2)],KOLKATA,50)?.stationName).toBe("Far")
    const split=near.map((r,i) => ({ ...r,last_update: r.last_update!.slice(0,-2)+String(i).padStart(2,"0") }))
    expect(normalizeCpcbAirQuality(split,KOLKATA,50)).toBeUndefined()
  })

  it.each(["NA","","-1","501","NaN"])("rejects invalid published readings: %s",(value) => {
    expect(normalizeCpcbAirQuality(cpcbRecords({ pollutant_avg: value }),KOLKATA,50)).toBeUndefined()
  })

  it("rejects stale, future, distant, and invalid-coordinate records",() => {
    for(const overrides of [
      { last_update: "01-01-2000 00:00:00" },{ last_update: "01-01-2099 00:00:00" },
      { latitude: "28.6",longitude: "77.2" },{ latitude: "" },{ latitude: "91" },
    ]) expect(normalizeCpcbAirQuality(cpcbRecords(overrides),KOLKATA,50)).toBeUndefined()
  })

  it("parses government reporting times in IST and rejects impossible dates",() => {
    expect(stationUpdateTime("06-09-2026 05:00:00")).toBe(Date.parse("2026-09-05T23:30:00Z"))
    expect(stationUpdateTime("31-02-2026 05:00:00")).toBeNaN()
  })
})
