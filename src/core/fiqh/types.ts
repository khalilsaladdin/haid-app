export type BloodColor = 'aswad' | 'ahmar' | 'asyqar' | 'ashfar' | 'akdar';

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy';

export type UserCycleCategory = 
  | 'mubtadi_ah_mumayyizah'
  | 'mubtadi_ah_ghayru_mumayyizah'
  | 'mu_tadah_mumayyizah'
  | 'mu_tadah_ghayru_mumayyizah';

export interface BloodEntry {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime?: string; // 'HH:mm' if ended
  durationHours: number;
  hasBlood: boolean;
  color?: BloodColor;
  intensity?: FlowIntensity;
  isNifas?: boolean;
}

export interface UserProfile {
  name: string;
  isFirstCycle: boolean; // Mubtadi'ah vs Mu'tadah
  usualHaidDays: number; // e.g., 7 days
  usualPurityDays: number; // e.g., 23 days
  activeCycleType: 'haid' | 'nifas';
}

export type FiqhStatus = 'HAID' | 'NIFAS' | 'ISTIHADHAH' | 'SUCI' | 'MAUQUF';

export interface PrayerQadhaResult {
  needsQadha: boolean;
  prayersToQadha: ('Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya')[];
  reason: string;
}

export interface ArchivedCycle {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalHaidHours: number;
  finalStatus: string;
  entries: BloodEntry[];
  note?: string;
}

export interface EvaluationResult {
  status: FiqhStatus;
  statusLabel: string;
  canPray: boolean;
  canFast: boolean;
  mustGhusl: boolean;
  totalAccumulatedHaidHours: number;
  currentDayInCycle: number;
  istihadhahCategory?: UserCycleCategory;
  prayerAdvice: string;
  explanation: string;
  qadhaDirectives?: PrayerQadhaResult;
}
