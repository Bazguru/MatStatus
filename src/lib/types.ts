export type Location = 'kyl' | 'frys' | 'skafferi';

export const LOCATIONS: { id: Location; label: string; icon: string }[] = [
  { id: 'kyl', label: 'Kylskåp', icon: '🧊' },
  { id: 'frys', label: 'Frys', icon: '❄️' },
  { id: 'skafferi', label: 'Skafferi', icon: '🥫' },
];

/** Where the expiry date came from – lets the UI show how much to trust it. */
export type ExpirySource = 'manual' | 'scanned' | 'estimated';

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: Location;
  category: string;
  addedAt: string; // ISO date (YYYY-MM-DD)
  expiresAt: string; // ISO date (YYYY-MM-DD)
  expirySource: ExpirySource;
  opened: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  done: boolean;
  /** Item that ran out and triggered this entry, if any. */
  fromItem?: string;
}

export interface Settings {
  /** Time of day for the daily summary, "HH:MM". */
  notifyTime: string;
  /** Warn this many days before expiry. */
  warnDays: number;
  notificationsEnabled: boolean;
}

export interface AppState {
  items: FoodItem[];
  shopping: ShoppingItem[];
  settings: Settings;
}
