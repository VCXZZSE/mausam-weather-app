import type { FastifyInstance } from "fastify"
import { advisoryQuerySchema, unavailableAdvisories } from "../advisories/service.js"

export async function advisoriesRoute(app: FastifyInstance): Promise<void> {
  app.get("/api/advisories", async (request, reply) => {
    reply.header("Cache-Control", "no-store")
    const query = advisoryQuerySchema.safeParse(request.query)
    if (!query.success) return reply.status(400).send({ error: "Valid coordinates and optional Indian pincode required" })
    return unavailableAdvisories()
  })
}
