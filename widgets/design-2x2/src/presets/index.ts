/**
 * Antigravity Weather Widget Presets
 * ────────────────────────────────────
 * Four self-contained 2×2 widget presets, each accepting a `data` prop
 * (populated by your weather API) and a `mode` prop ('dark' | 'light').
 *
 * Example API usage:
 *
 *   const data = await fetchWeather(lat, lon);
 *
 *   const widgetData = {
 *     temperature: `${Math.round(data.current.temp_c)}°`,
 *     location:    data.location.name,
 *     condition:   data.current.condition.text,
 *     hi:          `${Math.round(data.forecast.forecastday[0].day.maxtemp_c)}°`,
 *     lo:          `${Math.round(data.forecast.forecastday[0].day.mintemp_c)}°`,
 *   };
 *
 *   // then pick preset by condition code / weather type:
 *   <SunnyWidget       data={widgetData} mode="dark" />
 *   <ThunderstormWidget data={widgetData} mode="dark" />
 *   <MoonWidget        data={widgetData} mode="dark" />
 *   <OvercastWidget    data={widgetData} mode="dark" />
 */

export { default as SunnyWidget }        from './sunny/SunnyWidget';
export { default as ThunderstormWidget } from './thunderstorm/ThunderstormWidget';
export { default as MoonWidget }         from './moon/MoonWidget';
export { default as OvercastWidget }     from './overcast/OvercastWidget';

export type { WeatherData, ThemeMode, WidgetProps } from '../types/weather';
