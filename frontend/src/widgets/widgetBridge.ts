import { registerPlugin, Capacitor } from '@capacitor/core';
import type { DashboardWeatherData } from '../weatherData';
import type { ConditionKey } from './minimal/WeatherIcon';

export interface WidgetPayload {
  location: string;
  temperature: string;
  condition: string;
  hi: string;
  lo: string;
  preset: 'sunny' | 'thunderstorm' | 'moon';
  mode: 'dark' | 'light';
  feelsLike: string;
  conditionKey: ConditionKey;
  nextHours: number;
}

interface MausamWidgetNativePlugin {
  updateWidgetData(options: WidgetPayload): Promise<{ success: boolean }>;
}

const MausamWidget = registerPlugin<MausamWidgetNativePlugin>('MausamWidget');

/**
 * Maps condition text/codes to standard ConditionKey
 */
export function resolveConditionKey(conditionText = '', conditionCode = ''): ConditionKey {
  const text = (conditionText || '').toLowerCase();
  const code = (conditionCode || '').toLowerCase();

  if (text.includes('thunder') || text.includes('storm') || code.includes('thunder') || code.includes('storm')) {
    return 'thunderstorm';
  }
  if (text.includes('snow') || text.includes('sleet') || text.includes('ice') || code.includes('snow')) {
    return 'snow';
  }
  if (text.includes('heavy rain') || text.includes('torrential') || text.includes('downpour')) {
    return 'heavy-rain';
  }
  if (text.includes('rain') || text.includes('shower') || text.includes('squall') || code.includes('rain')) {
    return 'rain';
  }
  if (text.includes('drizzle')) {
    return 'drizzle';
  }
  if (text.includes('fog') || text.includes('mist') || text.includes('haze') || text.includes('smoke')) {
    return 'foggy';
  }
  if (text.includes('overcast') || text.includes('cloudy') || code.includes('cloudy')) {
    if (text.includes('partly') || code.includes('partly')) {
      return 'partly-cloudy';
    }
    return 'cloudy';
  }
  if (text.includes('clear') || text.includes('sunny') || code.includes('clear') || code.includes('sunny')) {
    return 'clear';
  }

  return 'clear';
}

/**
 * Resolves which 2x2 gradient widget preset best fits current conditions.
 */
export function resolveWidgetPreset(weather: DashboardWeatherData): 'sunny' | 'thunderstorm' | 'moon' {
  const current = weather.current;
  const key = resolveConditionKey(current.condition, current.conditionCode);

  if (key === 'thunderstorm' || key === 'rain' || key === 'heavy-rain') {
    return 'thunderstorm';
  }

  if (current.isDay === false || (current.condition || '').toLowerCase().includes('night')) {
    return 'moon';
  }

  return 'sunny';
}

/**
 * Calculates how many hours until conditions change from current conditionKey.
 */
export function calculateNextHours(weather: DashboardWeatherData, currentKey: ConditionKey): number {
  if (!weather.hourly || weather.hourly.length === 0) return 2;

  for (let i = 1; i < weather.hourly.length && i <= 6; i++) {
    const nextKey = resolveConditionKey(weather.hourly[i].condition, weather.hourly[i].conditionCode);
    if (nextKey !== currentKey) {
      return i;
    }
  }
  return 2;
}

/**
 * Syncs the latest weather data to the native Android widget SharedPreferences.
 */
export async function syncWeatherToWidget(
  weather: DashboardWeatherData | null | undefined,
  isDark = true
): Promise<void> {
  if (!weather || !weather.current) return;

  const current = weather.current;
  const preset = resolveWidgetPreset(weather);
  const conditionKey = resolveConditionKey(current.condition, current.conditionCode);
  const nextHours = calculateNextHours(weather, conditionKey);
  const mode: 'dark' | 'light' = isDark ? 'dark' : 'light';

  const payload: WidgetPayload = {
    location: current.city || 'Mausam',
    condition: current.condition || 'Clear Sky',
    temperature: `${Math.round(current.temperature)}°`,
    hi: `${Math.round(current.high)}°`,
    lo: `${Math.round(current.low)}°`,
    preset,
    mode,
    feelsLike: `${Math.round(current.feelsLike)}°`,
    conditionKey,
    nextHours,
  };

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await MausamWidget.updateWidgetData(payload);
    } catch (err) {
      console.warn('[MausamWidget] Failed to sync data to native widget:', err);
    }
  }
}
