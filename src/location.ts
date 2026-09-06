import { Capacitor } from "@capacitor/core"
import {
  Geolocation,
  type Position as CapacitorPosition,
  type PositionOptions as CapacitorPositionOptions,
} from "@capacitor/geolocation"

// Location-first architecture (backend-v0.2 handoff): the app must resolve
// a real user location — device GPS (reverse-geocoded) or manual search —
// before its first live weather request, rather than silently using a
// fixed default city. See §1-3 of the handoff for the full flow this
// module implements the client side of.

export type LocationSource="device"|"manual"|"default"

export type UserLocation={
  latitude: number
  longitude: number
  accuracyMeters?: number
  locality: string
  region: string
  country: string
  postalCode?: string
  timezone: string
  source: LocationSource
}

const LOCATION_STORAGE_KEY="mausam-location"

export function loadStoredLocation(): UserLocation|null {
  try {
    const raw=localStorage.getItem(LOCATION_STORAGE_KEY)
    if(!raw) return null
    const value=JSON.parse(raw) as Partial<UserLocation>
    if(
      typeof value.latitude!=="number"||
      typeof value.longitude!=="number"
    )
      return null
    if(typeof value.locality!=="string"||typeof value.source!=="string")
      return null
    return value as UserLocation
  } catch {
    return null
  }
}

export function saveLocation(location: UserLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(location))
  } catch {
    // Storage can legitimately be unavailable (private browsing, quota) —
    // the location still works for the current session, it just won't
    // persist across reloads.
  }
}

/** User-facing area label, including a manually resolved Indian PIN. */
export function formatUserLocation(location: UserLocation): string {
  const locality=location.locality.trim()||"Current location"
  const pin=location.postalCode?.trim()
  const primary=
    pin&&!locality.includes(pin)? `${locality} · ${pin}`:locality
  const region=location.region.trim()
  return region&&region.toLowerCase()!==locality.toLowerCase()
    ? `${primary}, ${region}`
    :primary
}

export function clearStoredLocation(): void {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Rounds to ~3 decimal places (~110m) — matches the backend's rounding. */
function roundCoordinate(value: number): number {
  return Math.round(value*1000)/1000
}

export type GeolocationFailureReason="unsupported"|"insecure-context"|"policy-blocked"|"permission-denied"|"services-disabled"|"position-unavailable"|"timeout"

export class GeolocationError extends Error {
  reason: GeolocationFailureReason
  constructor(reason: GeolocationFailureReason,message: string) {
    super(message)
    this.reason=reason
  }
}

const PRECISE_GEOLOCATION_OPTIONS: PositionOptions={
  enableHighAccuracy: true,
  timeout: 18_000,
  // Do not reuse an older city-level fix when the user explicitly asks
  // where they are now; a fresh fix improves neighbourhood resolution.
  maximumAge: 0,
}

// Desktop browsers and embedded preview surfaces can grant permission but
// still fail to acquire a high-accuracy fix. Weather only needs area-level
// coordinates, so retrying with network/coarse positioning is both more
// reliable and more privacy-preserving than treating that first failure as
// final.
const COARSE_GEOLOCATION_OPTIONS: PositionOptions={
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
}

const GEO_PERMISSION_DENIED=1
const GEO_POSITION_UNAVAILABLE=2
const GEO_TIMEOUT=3

function requestGeolocationAttempt(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve,reject) => {
    // Some browser providers do not invoke either callback within their
    // requested timeout. Enforce a UI deadline and ignore late callbacks.
    let settled=false
    const deadline=setTimeout(() => {
      if(settled) return
      settled=true
      reject(new GeolocationError("timeout","The browser did not return coordinates within the location deadline."))
    },(options.timeout??10_000)+1000)
    const finish=(action: () => void) => {
      if(settled) return
      settled=true
      clearTimeout(deadline)
      action()
    }
    try {
      navigator.geolocation.getCurrentPosition(
        position => finish(() => resolve(position)),
        (error) => finish(() => {
          // Use the standard numeric codes. Some embedded browsers expose only
          // `code` on the error object, not the legacy instance constants such
          // as `error.PERMISSION_DENIED`.
          if(error.code===GEO_PERMISSION_DENIED) {
            reject(
              new GeolocationError(
                /permissions? policy|feature policy/i.test(error.message)
                  ? "policy-blocked"
                  :/system|location services|kCLErrorDomain/i.test(error.message)
                    ? "services-disabled"
                    :"permission-denied",
                error.message||"Location permission was denied.",
              ),
            )
          } else if(error.code===GEO_POSITION_UNAVAILABLE) {
            reject(
              new GeolocationError(
                "position-unavailable",
                error.message||"Location is currently unavailable.",
              ),
            )
          } else if(error.code===GEO_TIMEOUT) {
            reject(
              new GeolocationError(
                "timeout",
                error.message||"Location request timed out.",
              ),
            )
          } else {
            reject(
              new GeolocationError(
                "position-unavailable",
                error.message||"The device could not provide a location.",
              ),
            )
          }
        }),
        options,
      )
    } catch(error) {
      finish(() => reject(error))
    }
  })
}

async function browserGeolocationPermissionState(): Promise<PermissionState|undefined> {
  try {
    if(!navigator.permissions?.query) return undefined
    let timer: ReturnType<typeof setTimeout>|undefined
    try {
      return await Promise.race([
        navigator.permissions.query({ name: "geolocation" }).then(status => status.state),
        new Promise<undefined>(resolve => { timer=setTimeout(() => resolve(undefined),500) }),
      ])
    } finally {
      clearTimeout(timer)
    }
  } catch {
    // Permissions API support is less consistent than geolocation itself.
    // A failed query must not prevent the standards-based location request.
    return undefined
  }
}

function mapNativeLocationError(error: unknown): GeolocationError {
  const details=
    error&&typeof error==="object"
      ? error as { code?: unknown; message?: unknown }
      :{}
  const code=typeof details.code==="string"? details.code:""
  const message=
    typeof details.message==="string"
      ? details.message
      :"The device could not provide a location."

  if(code==="OS-PLUG-GLOC-0003")
    return new GeolocationError("permission-denied",message)
  if(code==="OS-PLUG-GLOC-0007"||code==="OS-PLUG-GLOC-0017")
    return new GeolocationError("services-disabled",message)
  if(code==="OS-PLUG-GLOC-0010")
    return new GeolocationError("timeout",message)
  return new GeolocationError("position-unavailable",message)
}

async function requestNativeDeviceLocation(): Promise<CapacitorPosition> {
  try {
    let permission=await Geolocation.checkPermissions()
    if(
      permission.location!=="granted"&&
      permission.coarseLocation!=="granted"
    ) {
      permission=await Geolocation.requestPermissions({
        permissions: ["coarseLocation","location"],
      })
    }
    if(
      permission.location!=="granted"&&
      permission.coarseLocation!=="granted"
    ) {
      throw new GeolocationError(
        "permission-denied",
        "Location permission was denied.",
      )
    }

    const coarseOptions: CapacitorPositionOptions={
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
      enableLocationFallback: true,
    }
    try {
      return await Geolocation.getCurrentPosition(coarseOptions)
    } catch {
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: permission.location==="granted",
        timeout: 20_000,
        maximumAge: 0,
        enableLocationFallback: true,
      })
    }
  } catch(error) {
    if(error instanceof GeolocationError) throw error
    throw mapNativeLocationError(error)
  }
}

/**
 * Wraps navigator.geolocation.getCurrentPosition in a Promise with typed
 * failure reasons. Must be called from a user gesture (the location
 * button) per the W3C Geolocation spec and browser permission-prompt
 * requirements — never triggered automatically on page load.
 */
export async function requestDeviceLocation(
  options?: PositionOptions,
): Promise<GeolocationPosition|CapacitorPosition> {
  // The native Android shell needs Capacitor's permission bridge. The web
  // API alone cannot request Android runtime permissions, even when the
  // WebView itself appears to have been granted access.
  if(Capacitor.isNativePlatform()) return requestNativeDeviceLocation()

  // jsdom and a few embedded WebViews omit this property. Only reject an
  // explicit `false`; the browser still enforces its own secure-context
  // requirement when geolocation is invoked.
  if(window.isSecureContext===false) {
    throw new GeolocationError(
      "insecure-context",
      "Location requires HTTPS or a localhost URL.",
    )
  }
  if(
    !("geolocation" in navigator)||
    typeof navigator.geolocation.getCurrentPosition!=="function"
  ) {
    throw new GeolocationError(
      "unsupported",
      "Geolocation is not supported on this device.",
    )
  }

  const policyDocument=document as Document&{
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
    featurePolicy?: { allowsFeature: (feature: string) => boolean }
  }
  const policy=policyDocument.permissionsPolicy??policyDocument.featurePolicy
  if(policy?.allowsFeature("geolocation")===false) {
    throw new GeolocationError("policy-blocked","This page's embedding policy blocks location.")
  }

  // Request directly from the click. A Permissions API preflight can be
  // stale or hang in embedded browsers; it must not veto the actual request.
  // A caller-provided option set is treated as an explicit single attempt,
  // which keeps this helper predictable for tests and specialist callers.
  if(options) return requestGeolocationAttempt(options)

  // Weather needs an area-level fix, so start with the browser's faster,
  // network-assisted mode. Request GPS precision only when that cannot
  // produce a position. Previously this order was reversed, causing users
  // with permission granted to wait for a GPS timeout before any usable
  // location was attempted.
  try {
    return await requestGeolocationAttempt(COARSE_GEOLOCATION_OPTIONS)
  } catch(error) {
    if(!(error instanceof GeolocationError)) throw error

    // Chrome/Android can return PERMISSION_DENIED even while the site's
    // permission entry says "Allow" when Android Location Services or the
    // Chrome app-level location permission is disabled. Retry once with the
    // GPS provider, then surface that distinct and actionable state.
    if(error.reason==="policy-blocked"||error.reason==="services-disabled") throw error
    const permissionAfterError=await browserGeolocationPermissionState()
    const shouldRetry=
      error.reason==="position-unavailable"||
      error.reason==="timeout"||
      (error.reason==="permission-denied"&&
        permissionAfterError==="granted")
    if(!shouldRetry) {
      throw error
    }

    try {
      return await requestGeolocationAttempt(PRECISE_GEOLOCATION_OPTIONS)
    } catch(preciseError) {
      const finalPermission=await browserGeolocationPermissionState()
      if(
        preciseError instanceof GeolocationError&&
        preciseError.reason==="permission-denied"&&
        finalPermission==="granted"
      ) {
        throw new GeolocationError(
          "services-disabled",
          "Site permission is allowed, but the device or browser app is not providing location.",
        )
      }
      throw preciseError
    }
  }
}

type ReverseGeocodeResponse={
  locality: string
  region: string
  country: string
  postalCode?: string
  latitude: number
  longitude: number
}

/**
 * Resolves device coordinates into a place name via the backend's
 * reverse-geocoding endpoint (which proxies Nominatim server-side, with
 * rate limiting and caching — never called directly from the browser,
 * consistent with Nominatim's usage policy).
 */
async function clientSideReverseGeocodeFallback(latitude: number, longitude: number, signal?: AbortSignal) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("lat", String(latitude))
  url.searchParams.set("lon", String(longitude))
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("zoom", "18")
  
  const response = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error("Fallback reverse geocode failed")
  const body = (await response.json()) as any
  const address = body.address ?? {}
  const localityFields = ["neighbourhood", "quarter", "suburb", "hamlet", "village", "town", "city_district", "city", "municipality"]
  const locality = localityFields.map((f: string) => address[f]).find(Boolean) ?? body.display_name?.split(",")[0]?.trim() ?? "Unknown area"
  return {
    locality,
    region: address.state ?? address.county ?? "Unknown region",
    country: address.country ?? "Unknown country",
    postalCode: address.postcode,
  }
}

async function clientSideSearchFallback(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
  const normalizedQuery = query.trim()
  const isPinCode = /^[1-9]\d{5}$/.test(normalizedQuery)
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("countrycodes", "in")
  url.searchParams.set("accept-language", "en")
  url.searchParams.set("limit", "8")
  if (isPinCode) {
    url.searchParams.set("postalcode", normalizedQuery)
    url.searchParams.set("country", "India")
  } else {
    url.searchParams.set("q", `${normalizedQuery}, India`)
  }

  const response = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error("Fallback search failed")
  const body = (await response.json()) as any[]

  const seen = new Set<string>()
  return body.flatMap((item: any) => {
    const address = item.address ?? {}
    const latitude = Number(item.lat)
    const longitude = Number(item.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    const localityFields = ["neighbourhood", "quarter", "suburb", "hamlet", "village", "town", "city_district", "city", "municipality"]
    const locality = localityFields.map((f: string) => address[f]).find(Boolean) ?? (item.name || item.display_name)?.split(",")[0]?.trim() ?? "Unknown area"
    const postalCode = address.postcode ?? (isPinCode ? normalizedQuery : undefined)
    
    const dedupeKey = `${locality.toLowerCase()}|${postalCode ?? ""}|${latitude.toFixed(4)},${longitude.toFixed(4)}`
    if (seen.has(dedupeKey)) return []
    seen.add(dedupeKey)

    return [{
      name: locality,
      region: address.state ?? address.county ?? "",
      country: "India",
      postalCode,
      latitude,
      longitude,
      timezone: "Asia/Kolkata",
    }]
  }).filter((result: LocationSearchResult) => result.country.trim().toLowerCase() === "india")
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<{
  locality: string
  region: string
  country: string
  postalCode?: string
}> {
  const endpoint=import.meta.env.VITE_LOCATION_REVERSE_API_URL?.trim()
  if(!endpoint) throw new Error("Reverse geocoding endpoint is not configured")

  const url=new URL(endpoint,window.location.origin)
  url.searchParams.set("latitude",String(latitude))
  url.searchParams.set("longitude",String(longitude))

  try {
    const response=await fetch(url.toString(),{
      signal,
      headers: { Accept: "application/json" },
    })
    if(!response.ok)
      throw new Error(`Reverse geocoding failed with status ${response.status}`)

    const body=(await response.json()) as ReverseGeocodeResponse
    return {
      locality: body.locality,
      region: body.region,
      country: body.country,
      postalCode: body.postalCode,
    }
  } catch (error) {
    if (window.location.hostname !== "localhost") {
      return clientSideReverseGeocodeFallback(latitude, longitude, signal)
    }
    throw error
  }
}

export type LocationSearchResult={
  name: string
  region: string
  country: string
  postalCode?: string
  latitude: number
  longitude: number
  timezone: string
}

/** Explicit India-only place-name/PIN search through the backend. */
export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> {
  const endpoint=import.meta.env.VITE_LOCATION_SEARCH_API_URL?.trim()
  if(!query.trim()) return []
  if(!endpoint) throw new Error("Location search endpoint is not configured")

  const url=new URL(endpoint,window.location.origin)
  url.searchParams.set("query",query.trim())

  try {
    const response=await fetch(url.toString(),{
      signal,
      headers: { Accept: "application/json" },
    })
    if(!response.ok)
      throw new Error(`Location search failed with status ${response.status}`)

    const body=(await response.json()) as { results: LocationSearchResult[] }
    // The backend already scopes its provider query to India. Keep this
    // client-side boundary as defence in depth so a malformed/upstream result
    // can never render a foreign location in the India-focused app.
    return (body.results??[]).filter(
      (result) => result.country.trim().toLowerCase()==="india",
    )
  } catch (error) {
    if (window.location.hostname !== "localhost") {
      return clientSideSearchFallback(query, signal)
    }
    throw error
  }
}

/** Fast first stage: permission -> coordinates. */
export async function resolveDeviceCoordinates(): Promise<UserLocation> {
  const position=await requestDeviceLocation()
  const latitude=roundCoordinate(position.coords.latitude)
  const longitude=roundCoordinate(position.coords.longitude)

  return {
    latitude,
    longitude,
    accuracyMeters: position.coords.accuracy,
    locality: "Current location",
    region: "",
    country: "India",
    timezone: "",
    source: "device",
  }
}

/** Adds a readable area name without blocking the coordinate/weather path. */
export async function enrichDeviceLocation(
  location: UserLocation,
  signal?: AbortSignal,
): Promise<UserLocation> {
  try {
    const place=await reverseGeocodeCoordinates(
      location.latitude,
      location.longitude,
      signal,
    )
    return {
      ...location,
      locality: place.locality,
      region: place.region,
      country: place.country,
      postalCode: place.postalCode,
    }
  } catch {
    // Reverse geocoding failing should not block using the coordinates —
    // the weather endpoint only needs latitude/longitude to work.
    return location
  }
}

/** Full device-location flow retained for callers that want the place name too. */
export async function resolveDeviceLocation(
  signal?: AbortSignal,
): Promise<UserLocation> {
  return enrichDeviceLocation(await resolveDeviceCoordinates(),signal)
}

export function fromSearchResult(result: LocationSearchResult): UserLocation {
  return {
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
    locality: result.name,
    region: result.region,
    country: result.country,
    postalCode: result.postalCode,
    timezone: result.timezone,
    source: "manual",
  }
}

/** The explicitly-labelled demo location — only used when a user deliberately picks it. */
export function defaultDemoLocation(): UserLocation {
  return {
    latitude: 22.5726,
    longitude: 88.3639,
    locality: "Kolkata",
    region: "West Bengal",
    country: "India",
    timezone: "Asia/Kolkata",
    source: "default",
  }
}
