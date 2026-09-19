/** Shared types for all weather widget presets. */

export interface WeatherData {
  /** Current temperature, e.g. "26°" */
  temperature: string;
  /** City / location name, e.g. "San Francisco" */
  location: string;
  /** Short condition label, e.g. "Sunny" */
  condition: string;
  /** Daily high, e.g. "29°" */
  hi: string;
  /** Daily low, e.g. "18°" */
  lo: string;
}

export type ThemeMode = 'dark' | 'light';

/** Props accepted by every preset widget component. */
export interface WidgetProps {
  data: WeatherData;
  mode: ThemeMode;
}
