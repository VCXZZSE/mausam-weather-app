import { afterEach,describe,expect,it,vi } from "vitest"
import { createAirQualityCaches,resolveAirQuality } from "../src/aqi/resolveAirQuality.js"
import { loadEnv } from "../src/config/env.js"
import { cpcbBody,cpcbRecords } from "./cpcbFixtures.js"

const KOLKATA={ latitude: 22.5726,longitude: 88.3639 }
const log={ warn: vi.fn() }

describe("resolveAirQuality",() => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

  it("makes no request and omits AQI without a government key",async () => {
    const fetchSpy=vi.fn()
    vi.stubGlobal("fetch",fetchSpy)
    const env=loadEnv({ DATA_GOV_IN_API_KEY: "" })
    expect(await resolveAirQuality(env,createAirQualityCaches(env),KOLKATA,log)).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("uses and caches only CPCB station readings",async () => {
    const fetchSpy=vi.fn(async () => ({ ok: true,json: async () => cpcbBody() }))
    vi.stubGlobal("fetch",fetchSpy)
    const env=loadEnv({ DATA_GOV_IN_API_KEY: "test-key" })
    const caches=createAirQualityCaches(env)
    const result=await resolveAirQuality(env,caches,KOLKATA,log)
    expect(result).toMatchObject({ index: 78,source: "CPCB",standard: "IN_NAQI" })
    expect(await resolveAirQuality(env,caches,KOLKATA,log)).toEqual(result)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(new URL(fetchSpy.mock.calls[0][0]).hostname).toBe("api.data.gov.in")
  })

  it.each(["network","unauthorized","invalid","distant","stale"])(
    "omits AQI without a US fallback when CPCB is %s",async (failure) => {
      const fetchSpy=vi.fn(async () => {
        if(failure==="network") throw new Error("offline")
        return {
          ok: failure!=="unauthorized",status: 403,
          json: async () => failure==="invalid"? { error: "invalid response" }:{
            records: cpcbRecords(failure==="distant"
              ? { latitude: "28.6",longitude: "77.2" }
              :{ last_update: "01-01-2000 00:00:00" }),
          },
        }
      })
      vi.stubGlobal("fetch",fetchSpy)
      const env=loadEnv({ DATA_GOV_IN_API_KEY: "test-key" })
      expect(await resolveAirQuality(env,createAirQualityCaches(env),KOLKATA,log)).toBeUndefined()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(log.warn).toHaveBeenCalled()
    },
  )
})
