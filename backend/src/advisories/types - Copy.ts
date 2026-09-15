export type OfficialAlert = {
  id: string
  title: string
  description: string
  instruction?: string
  area: string
  source: string
  url: string
  issuedAt: string
  expiresAt: string
  severity: string
}

export type AdvisoryCategory = {
  status: "available" | "unavailable"
  alerts: OfficialAlert[]
}

export type AdvisoryResponse = {
  checkedAt: string | null
  categories: Record<"general" | "farming" | "fishing", AdvisoryCategory>
}
