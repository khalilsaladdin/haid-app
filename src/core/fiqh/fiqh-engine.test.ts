import { describe, it, expect } from 'vitest';
import { evaluateFiqhCycle, calculatePrayerQadha } from './fiqh-engine';
import type { BloodEntry, UserProfile } from './types';

describe('Fiqh Calculation Engine (Mazhab Syafi\'i)', () => {
  const defaultProfile: UserProfile = {
    name: 'Fatimah',
    isFirstCycle: false,
    usualHaidDays: 7,
    usualPurityDays: 23,
    activeCycleType: 'haid',
  };

  it('Scenario 1: Normal 7-day haid should be recognized as HAID', () => {
    const entries: BloodEntry[] = [
      { id: '1', date: '2026-10-01', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '2', date: '2026-10-02', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '3', date: '2026-10-03', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '4', date: '2026-10-04', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '5', date: '2026-10-05', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '6', date: '2026-10-06', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '7', date: '2026-10-07', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
    ];

    const result = evaluateFiqhCycle(entries, defaultProfile, 20);
    expect(result.status).toBe('HAID');
    expect(result.canPray).toBe(false);
    expect(result.totalAccumulatedHaidHours).toBe(168);
  });

  it('Scenario 2: Bleeding stops at day 7 -> Status becomes SUCI with Ghusl required', () => {
    const entries: BloodEntry[] = [
      { id: '1', date: '2026-10-01', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '2', date: '2026-10-02', startTime: '06:00', durationHours: 24, hasBlood: true, color: 'ahmar' },
      { id: '3', date: '2026-10-03', startTime: '06:00', durationHours: 0, hasBlood: false },
    ];

    const result = evaluateFiqhCycle(entries, defaultProfile, 20);
    expect(result.status).toBe('SUCI');
    expect(result.canPray).toBe(true);
    expect(result.mustGhusl).toBe(true);
  });

  it('Scenario 3: Bleeding exceeds 15 days for Mu\'tadah Ghayru Mumayyazah -> Returns to habit', () => {
    // 16 days of uniform red blood
    const entries: BloodEntry[] = Array.from({ length: 16 }, (_, i) => ({
      id: String(i + 1),
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      startTime: '06:00',
      durationHours: 24,
      hasBlood: true,
      color: 'ahmar',
    }));

    const result = evaluateFiqhCycle(entries, defaultProfile, 20);
    expect(result.status).toBe('ISTIHADHAH');
    expect(result.istihadhahCategory).toBe('mu_tadah_ghayru_mumayyizah');
    expect(result.canPray).toBe(true);
    expect(result.explanation).toContain('dikembalikan ke siklus bulan lalu (7 hari)');
  });

  it('Scenario 4: Bleeding exceeds 15 days with Mumayyizah -> Strong blood = Haid, Weak blood = Istihadhah', () => {
    // 5 days of black blood (Aswad) followed by 11 days of yellow/keruh (Ashfar/Akdar)
    const strongEntries: BloodEntry[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      startTime: '06:00',
      durationHours: 24,
      hasBlood: true,
      color: 'aswad' as const,
    }));

    const weakEntries: BloodEntry[] = Array.from({ length: 11 }, (_, i) => ({
      id: String(i + 6),
      date: `2026-10-${String(i + 6).padStart(2, '0')}`,
      startTime: '06:00',
      durationHours: 24,
      hasBlood: true,
      color: 'ashfar' as const,
    }));

    const entries = [...strongEntries, ...weakEntries];
    const result = evaluateFiqhCycle(entries, defaultProfile, 20);

    expect(result.status).toBe('ISTIHADHAH');
    expect(result.istihadhahCategory).toBe('mu_tadah_mumayyizah');
    expect(result.canPray).toBe(true);
    expect(result.explanation).toContain('durasi darah kuat (120 jam)');
  });

  it('Scenario 5: Purified in Ashar time -> Must pray Ashar AND qadha Dzuhur', () => {
    // Purified with 15 minutes left before Maghrib
    const qadha = calculatePrayerQadha('purified', 'Ashar', 150, 15);
    expect(qadha.needsQadha).toBe(true);
    expect(qadha.prayersToQadha).toEqual(['Ashar', 'Dzuhur']);
  });

  it('Scenario 6: Bleeding starts after 30 minutes in Dzuhur without praying -> Dzuhur must be made up', () => {
    const qadha = calculatePrayerQadha('start_bleeding', 'Dzuhur', 30, 120);
    expect(qadha.needsQadha).toBe(true);
    expect(qadha.prayersToQadha).toEqual(['Dzuhur']);
  });
});
