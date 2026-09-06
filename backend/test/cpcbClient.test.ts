import { describe,expect,it,vi } from "vitest"
import { fetchCpcbRecords } from "../src/providers/cpcbClient.js"
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

  it("rejects unauthorized responses without including the API key in errors",async () => {
    const mock=vi.fn().mockResolvedValue({ ok: false,status: 403 })
    await expect(fetchCpcbRecords({ baseUrl,apiKey: "secret-test-key",fetchImpl: mock })).rejects.toThrow("CPCB request failed with status 403")
  })
})
