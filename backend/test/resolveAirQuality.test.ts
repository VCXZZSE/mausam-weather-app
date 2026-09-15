import { afterEach,describe,expect,it,vi } from "vitest"
import { createAirQualityCaches,redactApiKey,resetAirQualityWarnings,resolveAirQuality } from "../src/aqi/resolveAirQuality.js"
import { loadEnv } from "../src/config/env.js"
import { cpcbBody,cpcbRecords } from "./cpcbFixtures.js"

const KOLKATA={ latitude: 22.5726,longitude: 88.3639 }
const log={ warn: vi.fn() }

describe("resolveAirQuality",() => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); resetAirQualityWarnings() })

  it("makes no request and omits AQI without a government key",async () => {
    const fetchSpy=vi.fn()
    vi.stubGlobal("fetch",fetchSpy)
    const env=loadEnv({ DATA_GOV_IN_API_KEY: "" })
    expect(await resolveAirQuality(env,createAirQualityCaches(env),KOLKATA,log)).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("says why AQI is missing when the key is unset, once per process",async () => {
    vi.stubGlobal("fetch",vi.fn())
    const env=loadEnv({ DATA_GOV_IN_API_KEY: "" })
    const caches=createAirQualityCaches(env)
    await resolveAirQuality(env,caches,KOLKATA,log)
    expect(log.warn).toHaveBeenCalledOnce()
    expect(log.warn.mock.calls[0][0]).toMatchObject({ setting: "DATA_GOV_IN_API_KEY" })
    expect(log.warn.mock.calls[0][1]).toMatch(/DATA_GOV_IN_API_KEY is not set/)

    // A deployment mistake must not spam a line per weather request.
    await resolveAirQuality(env,caches,KOLKATA,log)
    await resolveAirQuality(env,caches,KOLKATA,log)
    expect(log.warn).toHaveBeenCalledOnce()
  })

  it("reports the provider failure reason without leaking the API key",async () => {
    vi.stubGlobal("fetch",vi.fn(async () => ({ ok: false,status: 403 })))
    const env=loadEnv({ DATA_GOV_IN_API_KEY: "super-secret-key" })
    await resolveAirQuality(env,createAirQualityCaches(env),KOLKATA,log)
    const reason=String((log.warn.mock.calls[0][0] as { reason: string }).reason)
    expect(reason).toMatch(/403/)
    expect(reason).not.toContain("super-secret-key")
  })

  it("masks the key in any provider error text",() => {
    const leak=new Error("fetch failed for https://api.data.gov.in/resource/x?api-key=abc123&format=json")
    expect(redactApiKey(leak)).toContain("api-key=[REDACTED]")
    expect(redactApiKey(leak)).not.toContain("abc123")
    expect(redactApiKey(leak)).toContain("format=json")
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
