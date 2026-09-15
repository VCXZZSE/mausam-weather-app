/**
 * Fails the Android build when `dist/` was produced with development settings.
 *
 * The packaged app is served by Capacitor from `https://localhost` on the
 * phone, so a bundle carrying `http://localhost:3000` (a contributor's `.env`)
 * or only a relative `/api/weather` path has nowhere real to send its requests.
 * The app installs and opens, then fails every weather call — which looks like
 * a backend outage rather than a build mistake. Catching it here, before
 * `cap sync` copies the bundle into `android/app/src/main/assets`, keeps that
 * failure out of the APK entirely.
 *
 * Runs automatically as part of `npm run build:android`.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const assetsDir = join("dist", "assets")

if (!existsSync(assetsDir)) {
  console.error("\n[android] dist/assets is missing — run `npm run build:android` first.\n")
  process.exit(1)
}

const bundle = readdirSync(assetsDir)
  .filter(name => name.endsWith(".js"))
  .map(name => readFileSync(join(assetsDir, name), "utf8"))
  .join("\n")

const problems = []

if (/https?:\/\/localhost(:\d+)?\/api\//.test(bundle)) {
  problems.push(
    "the bundle still points at a localhost API — that address is the PHONE when packaged",
  )
}

if (!/https:\/\/[a-z0-9.-]+\/api\/weather/i.test(bundle)) {
  problems.push(
    "no absolute https weather endpoint was baked in — the app would request https://localhost/api/weather on the device",
  )
}

if (problems.length > 0) {
  console.error("\n[android] This bundle is not safe to ship to a device:\n")
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    "\nBuild through the Android scripts so .env.android is applied:\n" +
      "  npm run android:sync     (build + copy into the Android project)\n" +
      "  npm run android          (the above, then open Android Studio)\n" +
      "\nA plain `npm run build` targets the website, not the APK.\n",
  )
  process.exit(1)
}

console.log("[android] bundle verified — absolute production endpoints baked in.")
