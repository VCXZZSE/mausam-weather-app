import type { CpcbRecord } from "../providers/cpcbClient.js"
import type { DashboardWeatherData } from "../types/dashboard.js"

// The OGD resource publishes pollutant-wise National AQI values, not
// concentration measurements. Do not apply concentration breakpoints a
// second time or label these values as µg/m³.
// https://www.data.gov.in/catalog/real-time-air-quality-index
// CPCB overall AQI requires >=3 pollutants, including PM2.5 or PM10:
// https://cpcb.nic.in/National-Air-Quality-Index/
const IN_NAQI_CATEGORIES: Array<{ max: number; label: string; icon: string }>=[
  { max: 50,label: "Good",icon: "😊" },
  { max: 100,label: "Satisfactory",icon: "🙂" },
  { max: 200,label: "Moderate",icon: "😐" },
  { max: 300,label: "Poor",icon: "😷" },
  { max: 400,label: "Very Poor",icon: "🚫" },
  { max: Infinity,label: "Severe",icon: "☠️" },
]

function categorize(index: number) {
  return (
    IN_NAQI_CATEGORIES.find((category) => index<=category.max)??
    IN_NAQI_CATEGORIES[IN_NAQI_CATEGORIES.length-1]
  )
}

// Haversine distance in kilometers.
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R=6371
  const dLat=((lat2-lat1)*Math.PI)/180
  const dLon=((lon2-lon1)*Math.PI)/180
  const a=
    Math.sin(dLat/2)**2+
    Math.cos((lat1*Math.PI)/180)*
    Math.cos((lat2*Math.PI)/180)*
    Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

const POLLUTANT_DISPLAY: Record<string,{ label: string; color: string }>={
  "PM2.5": { label: "PM2.5",color: "#f59e0b" },
  PM10: { label: "PM10",color: "#f97316" },
  OZONE: { label: "O₃",color: "#60a5fa" },
  NO2: { label: "NO₂",color: "#a78bfa" },
  SO2: { label: "SO₂",color: "#34d399" },
  CO: { label: "CO",color: "#f472b6" },
  NH3: { label: "NH₃",color: "#2dd4bf" },
}

// The government feed uses DD-MM-YYYY HH:mm:ss in Indian Standard Time.
export function stationUpdateTime(value: string|undefined): number {
  const match=value?.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  if(!match) return NaN
  const [,day,month,year,hour,minute,second]=match
  const iso=`${year}-${month}-${day}T${hour}:${minute}:${second}`
  const time=Date.parse(`${iso}+05:30`)
  return Number.isFinite(time)&&new Date(time+19800000).toISOString().slice(0,19)===iso? time:NaN
}

export type NearestStationResult=DashboardWeatherData["airQuality"]|undefined

/** Choose the nearest station with a complete, recent government reading. */
export function normalizeCpcbAirQuality(
  records: CpcbRecord[],
  target: { latitude: number; longitude: number },
  maxDistanceKm: number,
  now=Date.now(),
): NearestStationResult {
  const stations=new Map<string,{ name: string; latitude: number; longitude: number; updatedAt: number; updatedLabel: string; readings: Map<string,number> }>()
  for(const record of records) {
    const lat=Number(record.latitude)
    const lon=Number(record.longitude)
    const updatedAt=stationUpdateTime(record.last_update)
    const raw=record.pollutant_avg?.trim()
    const index=Number(raw)
    if(!record.latitude.trim()||!record.longitude.trim()||
      !Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||
      !Number.isFinite(updatedAt)||now-updatedAt>24*3600000||updatedAt>now+300000||
      !raw||!Number.isFinite(index)||index<0||index>500||!POLLUTANT_DISPLAY[record.pollutant_id]) continue
    // Never mix stations with the same name, or different reporting times.
    const key=`${record.station}|${lat},${lon}|${updatedAt}`
    let station=stations.get(key)
    if(!station) {
      station={ name: record.station||`${lat}, ${lon}`,latitude: lat,longitude: lon,updatedAt,updatedLabel: record.last_update!,readings: new Map() }
      stations.set(key,station)
    }
    station.readings.set(record.pollutant_id,Math.max(index,station.readings.get(record.pollutant_id)??0))
  }

  let result: NearestStationResult
  let nearestDistance=Infinity
  let newestTime=-Infinity
  for(const station of stations.values()) {
    if(station.readings.size<3||(!station.readings.has("PM2.5")&&!station.readings.has("PM10"))) continue
    const distance=distanceKm(target.latitude,target.longitude,station.latitude,station.longitude)
    if(distance>maxDistanceKm||distance>nearestDistance||(distance===nearestDistance&&station.updatedAt<=newestTime)) continue
    const index=Math.round(Math.max(...station.readings.values()))
    const { label,icon }=categorize(index)
    nearestDistance=distance
    newestTime=station.updatedAt
    result={
      index,scaleMax: 500,
      scaleLabels: IN_NAQI_CATEGORIES.map((category) => category.label),
      label,icon,advice: adviceForNaqi(label),
      updatedLabel: `Station update: ${station.updatedLabel} IST`,
      standard: "IN_NAQI",source: "CPCB",
      stationName: station.name,stationDistanceKm: Math.round(distance*10)/10,
      pollutants: [...station.readings].map(([id,value]) => ({
        ...POLLUTANT_DISPLAY[id],value: Math.round(value),unit: "AQI sub-index",scaleMax: 500,
      })),
    }
  }
  return result
}

function adviceForNaqi(label: string): string {
  switch(label) {
    case "Good":
      return "✅ Air quality is good — safe for outdoor activity."
    case "Satisfactory":
      return "🙂 Air quality is acceptable for most people."
    case "Moderate":
      return "💡 Sensitive groups should reduce prolonged outdoor exertion."
    case "Poor":
      return "😷 Limit prolonged outdoor exertion; consider a mask."
    case "Very Poor":
      return "🚫 Avoid outdoor exertion; keep windows closed."
    default:
      return "🚨 Severe air quality — stay indoors if possible."
  }
}
