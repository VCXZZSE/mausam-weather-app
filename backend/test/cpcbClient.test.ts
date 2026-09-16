import { describe,expect,it,vi } from "vitest"
import { fetchCpcbRecords,type CpcbRecord } from "../src/providers/cpcbClient.js"
import { cpcbRecords } from "./cpcbFixtures.js"

const baseUrl="https://api.data.gov.in/resource/test"

describe("CPCB government feed",() => {
  it("accepts current avg_value fields, older exports, numeric values and unavailable readings",async () => {
    const records=cpcbRecords()
    const current=records.map(({ pollutant_avg,...record }) => ({ ...record,avg_value: Number(pollutant_avg) }))
    const fetchImpl=vi.fn(async () => ({ ok: true,json: async () => ({ records: [...current,...records,{ ...current[0],avg_value: "NA" }] }) })) as unknown as typeof fetch
    const result=await fetchCpcbRecords({ baseUrl,apiKey: "test-key",fetchImpl })
    expect(result.map(r => r.pollutant_avg)).toEqual(["78","68","22","78","68","22","NA"])
  })

  it("reads all government pages instead of omitting stations beyond the first page",async () => {
    const records=cpcbRecords()
    const mock=vi.fn()
      .mockResolvedValueOnce({ ok: true,json: async () => ({ records: records.slice(0,2),total: "3" }) })
      .mockResolvedValueOnce({ ok: true,json: async () => ({ records: records.slice(2),total: "3" }) })
    expect(await fetchCpcbRecords({ baseUrl,apiKey: "test-key",limit: 2,fetchImpl: mock })).toHaveLength(3)
    expect(new URL(mock.mock.calls[1][0]).searchParams.get("offset")).toBe("2")
  })

  it("gives every page its own timeout instead of one budget for the whole walk",async () => {
    const records=cpcbRecords()
    // Each page takes most of the per-page budget. Under a single shared
    // deadline the second page was aborted before it could start.
    const slowPage=(slice: CpcbRecord[]) => async (_url: string,init?: RequestInit) =>
      new Promise((resolve,reject) => {
        const timer=setTimeout(() => resolve({ ok: true,json: async () => ({ records: slice,total: "3" }) }),40)
        init?.signal?.addEventListener("abort",() => { clearTimeout(timer); reject(new Error("aborted")) })
      })
    const mock=vi.fn()
      .mockImplementationOnce(slowPage(records.slice(0,2)))
      .mockImplementationOnce(slowPage(records.slice(2)))
    const result=await fetchCpcbRecords({ baseUrl,apiKey: "test-key",limit: 2,timeoutMs: 60,fetchImpl: mock as unknown as typeof fetch })
    expect(result).toHaveLength(3)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it("aborts a page that exceeds the per-page timeout",async () => {
    const mock=vi.fn(async (_url: string,init?: RequestInit) =>
      new Promise((_resolve,reject) => {
        init?.signal?.addEventListener("abort",() => reject(new Error("The operation was aborted")))
      }))
    await expect(
      fetchCpcbRecords({ baseUrl,apiKey: "test-key",timeoutMs: 30,fetchImpl: mock as unknown as typeof fetch }),
    ).rejects.toThrow(/abort/i)
  })

  it("rejects unauthorized responses without including the API key in errors",async () => {
    const mock=vi.fn().mockResolvedValue({ ok: false,status: 403 })
    await expect(fetchCpcbRecords({ baseUrl,apiKey: "secret-test-key",fetchImpl: mock })).rejects.toThrow("CPCB request failed with status 403")
  })
})
