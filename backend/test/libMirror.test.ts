import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"

// `lib/` is the copy of the backend the Vercel serverless functions in `api/`
// import; `backend/src/` is what the Fastify server runs. They are meant to be
// the same code, so a fix applied to one and not the other silently ships two
// different behaviours to the two deployments — exactly the kind of drift that
// is invisible until a user hits the wrong one.
//
// This test fails the suite on any mismatch. When you change a shared module,
// copy it across rather than deleting the assertion.

const REPO = resolve(__dirname, "..", "..")
const BACKEND_SRC = join(REPO, "backend", "src")
const LIB = join(REPO, "lib")

/**
 * Modules that are deliberately different, with the reason. Keep this list as
 * short as it can be: every entry is a place the two deployments diverge.
 */
const ALLOWED_DRIFT: Record<string, string> = {
  "config/env.ts":
    "ALLOWED_ORIGINS default differs: the Fastify dev server also allows the " +
    "127.0.0.1 forms the Android emulator uses, which the Vercel copy has no " +
    "reason to widen to. Both files carry a header comment explaining it.",
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith(".ts")) out.push(full)
  }
  return out
}

/** Posix-style path relative to `root`, so keys match on Windows too. */
const key = (root: string, file: string) =>
  relative(root, file).split(sep).join("/")

describe("lib/ mirrors backend/src/", () => {
  const libFiles = walk(LIB).map((f) => key(LIB, f))

  it("has something to compare", () => {
    expect(libFiles.length).toBeGreaterThan(0)
  })

  it.each(libFiles)("%s is byte-identical", (rel) => {
    const backendFile = join(BACKEND_SRC, rel)

    let backendSource: string
    try {
      backendSource = readFileSync(backendFile, "utf8")
    } catch {
      throw new Error(
        `lib/${rel} has no counterpart at backend/src/${rel}. ` +
          `Add it, or delete the orphan in lib/.`,
      )
    }

    const libSource = readFileSync(join(LIB, rel), "utf8")

    if (rel in ALLOWED_DRIFT) {
      expect(
        libSource,
        `lib/${rel} is on the allowed-drift list but now matches backend/src. ` +
          `Remove the entry from ALLOWED_DRIFT.`,
      ).not.toBe(backendSource)
      return
    }

    expect(
      libSource,
      `lib/${rel} and backend/src/${rel} have drifted. Copy the change across, ` +
        `or add the path to ALLOWED_DRIFT with a reason.`,
    ).toBe(backendSource)
  })

  it("only skips modules the serverless deployment genuinely does not need", () => {
    // Plenty of backend modules have no serverless counterpart: the Fastify
    // server, its routes and middleware, and anything reached only from an
    // endpoint `api/` does not expose. Listing them means adding a new shared
    // module without copying it to lib/ shows up here as an unexpected entry,
    // rather than passing silently.
    const mirroredDirs = new Set(libFiles.map((f) => f.split("/")[0]))
    const backendOnly = walk(BACKEND_SRC)
      .map((f) => key(BACKEND_SRC, f))
      .filter((f) => mirroredDirs.has(f.split("/")[0]))
      .filter((f) => !libFiles.includes(f))
      .sort()

    // `api/` exposes weather, advisories and location only — there is no
    // serverless briefing endpoint, and geocoding is reached from the Fastify
    // location route alone. Removing a name here means lib/ must gain the file.
    const EXPECTED_BACKEND_ONLY = [
      "briefing/BriefingGenerator.ts",
      "briefing/DeterministicBriefingGenerator.ts",
      "briefing/buildPersonalizedBriefing.ts",
      "briefing/personaComposers.ts",
      "briefing/riskDetection.ts",
      "briefing/validateBriefingRequest.ts",
      "briefing/validateBriefingResponse.ts",
      "providers/openMeteoGeocodingClient.ts",
    ].sort()

    expect(
      backendOnly,
      `the set of backend-only modules changed. If the new module is shared, ` +
        `copy it into lib/; if it is genuinely backend-only, add it here.`,
    ).toEqual(EXPECTED_BACKEND_ONLY)
  })
})
