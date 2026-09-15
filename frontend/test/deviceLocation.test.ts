import { afterEach,describe,expect,it,vi } from "vitest"
import { requestDeviceLocation } from "../src/location"

const position={ coords: { latitude: 22.57,longitude: 88.36,accuracy: 30 } } as GeolocationPosition

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function browser(getCurrentPosition: ReturnType<typeof vi.fn>,query=vi.fn()) {
  vi.stubGlobal("navigator",{ geolocation: { getCurrentPosition },permissions: { query } })
}

describe("browser device location",() => {
  it("requests coordinates immediately without allowing a stale denied preflight to veto them",async () => {
    const query=vi.fn().mockResolvedValue({ state: "denied" })
    const get=vi.fn(success => success(position))
    browser(get,query)
    const request=requestDeviceLocation()
    expect(get).toHaveBeenCalledTimes(1)
    await expect(request).resolves.toBe(position)
    expect(query).not.toHaveBeenCalled()
  })

  it("retries precise positioning when site permission is granted but the first provider denies",async () => {
    const get=vi.fn()
      .mockImplementationOnce((_success,failure) => failure({ code: 1,message: "Permission denied" }))
      .mockImplementationOnce(success => success(position))
    browser(get,vi.fn().mockResolvedValue({ state: "granted" }))
    await expect(requestDeviceLocation()).resolves.toBe(position)
    expect(get.mock.calls[1][2].enableHighAccuracy).toBe(true)
  })

  it("does not retry a real user denial",async () => {
    const get=vi.fn((_success,failure) => failure({ code: 1,message: "User denied Geolocation" }))
    browser(get,vi.fn().mockResolvedValue({ state: "denied" }))
    await expect(requestDeviceLocation()).rejects.toMatchObject({ reason: "permission-denied" })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it("distinguishes system denial from site denial",async () => {
    browser(vi.fn((_success,failure) => failure({ code: 1,message: "Geolocation has been disabled in this document by system" })))
    await expect(requestDeviceLocation()).rejects.toMatchObject({ reason: "services-disabled" })
  })

  it("distinguishes an embedding policy block from user denial",async () => {
    browser(vi.fn((_success,failure) => failure({ code: 1,message: "Permissions policy violation: geolocation blocked" })))
    await expect(requestDeviceLocation()).rejects.toMatchObject({ reason: "policy-blocked" })
  })

  it("ends a request when the browser never calls back and ignores a late fix",async () => {
    vi.useFakeTimers()
    try {
      let lateSuccess: PositionCallback|undefined
      browser(vi.fn(success => { lateSuccess=success }))
      const result=requestDeviceLocation({ timeout: 5000 })
      const assertion=expect(result).rejects.toMatchObject({ reason: "timeout" })
      await vi.advanceTimersByTimeAsync(6000)
      await assertion
      lateSuccess?.(position)
      expect(vi.getTimerCount()).toBe(0)
    } finally { vi.useRealTimers() }
  })

  it("rejects insecure LAN origins before requesting coordinates",async () => {
    vi.stubGlobal("isSecureContext",false)
    const get=vi.fn()
    browser(get)
    await expect(requestDeviceLocation()).rejects.toMatchObject({ reason: "insecure-context" })
    expect(get).not.toHaveBeenCalled()
  })
})
