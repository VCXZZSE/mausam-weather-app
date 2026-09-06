import { advisoryQuerySchema, unavailableAdvisories } from "../lib/advisories/service.js"

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Cache-Control", "no-store")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" })
  const query = advisoryQuerySchema.safeParse(req.query)
  if (!query.success) return res.status(400).json({ error: "Valid coordinates and optional Indian pincode required" })
  return res.status(200).json(unavailableAdvisories())
}
