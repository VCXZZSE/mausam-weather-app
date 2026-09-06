import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { loadEnv } from "./config/env.js"
import { buildApp } from "./app.js"

async function main(): Promise<void> {
  const envPath = fileURLToPath(new URL("../.env", import.meta.url))
  if (existsSync(envPath)) process.loadEnvFile(envPath)
  const env = loadEnv()
  const app = await buildApp(env)

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

main()
