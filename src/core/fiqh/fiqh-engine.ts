import type { BloodEntry, UserProfile, EvaluationResult, PrayerQadhaResult, BloodColor } from './types';

// Color hierarchy ranking (1 = strongest, 5 = weakest)
export const COLOR_STRENGTH: Record<BloodColor, number> = {
  aswad: 1,
  ahmar: 2,
  asyqar: 3,
  ashfar: 4,
  akdar: 5,
};

/**
 * Checks if a blood color is strictly stronger than another
 */
export function isBloodStronger(colorA: BloodColor, colorB: BloodColor): boolean {
  return COLOR_STRENGTH[colorA] < COLOR_STRENGTH[colorB];
}

/**
 * Calculate Prayer Qadha according to Syafi'i Idrakul Waqti rule
 */
export function calculatePrayerQadha(
  event: 'start_bleeding' | 'purified',
  prayerTime: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya',
  minutesPassedInWaqt: number,
  minutesRemainingInWaqt: number
): PrayerQadhaResult {
  if (event === 'start_bleeding') {
    // If entered prayer time and had enough time to do wudhu + 4 rakaat (~15 mins) but didn't pray
    if (minutesPassedInWaqt >= 15) {
      return {
        needsQadha: true,
        prayersToQadha: [prayerTime],
        reason: `Darah keluar setelah waktu ${prayerTime} berjalan ${minutesPassedInWaqt} menit (cukup untuk shalat tapi belum dikerjakan). Wajib diqadha setelah suci.`,
      };
    }
    return {
      needsQadha: false,
      prayersToQadha: [],
      reason: `Darah keluar seketika masuk waktu ${prayerTime} tanpa sempat melaksanakan shalat. Tidak ada kewajiban qadha.`,
    };
  }

  // Event: Purified (Inqitha'ud Dam)
  // If at least enough time for Takbiratul Ihram (~1-2 minutes)
  if (minutesRemainingInWaqt >= 2) {
    if (prayerTime === 'Ashar') {
      return {
        needsQadha: true,
        prayersToQadha: ['Ashar', 'Dzuhur'],
        reason: `Suci di waktu Ashar mewajibkan shalat Ashar DAN mengqadha shalat Dzuhur (karena keduanya memiliki hubungan jamak ta'khir).`,
      };
    }
    if (prayerTime === 'Isya') {
      return {
        needsQadha: true,
        prayersToQadha: ['Isya', 'Maghrib'],
        reason: `Suci di waktu Isya mewajibkan shalat Isya DAN mengqadha shalat Maghrib (karena keduanya memiliki hubungan jamak ta'khir).`,
      };
    }
    return {
      needsQadha: true,
      prayersToQadha: [prayerTime],
      reason: `Suci di waktu ${prayerTime} dengan sisa waktu cukup. Wajib melaksanakan shalat ${prayerTime}.`,
    };
  }

  return {
    needsQadha: false,
    prayersToQadha: [],
    reason: `Sisa waktu ${prayerTime} kurang dari 2 menit (tidak cukup takbir). Wajib langsung shalat waktu berikutnya.`,
  };
}

/**
 * Core Fiqh Engine for evaluating menstrual status and legal duties
 */
export function evaluateFiqhCycle(
  entries: BloodEntry[],
  profile: UserProfile,
  daysSinceLastPurity: number = 20
): EvaluationResult {
  // 1. Check if user is in Nifas context
  if (profile.activeCycleType === 'nifas') {
    return evaluateNifas(entries);
  }

  // 2. Calculate total accumulated hours of bleeding within the current window
  const activeEntries = entries.filter((e) => e.hasBlood);
  const totalBleedingHours = activeEntries.reduce((acc, curr) => acc + curr.durationHours, 0);

  // Determine span in days from first bleeding to last entry
  const dayCount = entries.length > 0 ? entries.length : 1;
  const latestEntry = entries[entries.length - 1];

  // Case A: Minimum purity between two cycles is not met (< 15 days)
  if (daysSinceLastPurity < 15 && activeEntries.length > 0 && dayCount === 1) {
    return {
      status: 'ISTIHADHAH',
      statusLabel: 'Istihadhah (Darah Rusak)',
      canPray: true,
      canFast: true,
      mustGhusl: false,
      totalAccumulatedHaidHours: totalBleedingHours,
      currentDayInCycle: dayCount,
      prayerAdvice: 'Wajib berwudhu setiap masuk waktu shalat fardhu dan tetap shalat.',
      explanation: `Masa suci Anda baru berlangsung ${daysSinceLastPurity} hari (kurang dari batas minimal suci 15 hari). Darah ini dihukumi Dam Fasid / Istihadhah.`,
    };
  }

  // Case B: Currently no blood (dry / purified)
  if (!latestEntry || !latestEntry.hasBlood) {
    // If previously bleeding was accumulated >= 24h and within 15 days
    if (totalBleedingHours >= 24 && dayCount <= 15) {
      return {
        status: 'SUCI',
        statusLabel: 'Suci / Terputus Sementara',
        canPray: true,
        canFast: true,
        mustGhusl: true,
        totalAccumulatedHaidHours: totalBleedingHours,
        currentDayInCycle: dayCount,
        prayerAdvice: 'Wajib mandi besar jika darah telah berhenti tuntas (jufuf / qashshah baidha) lalu shalat.',
        explanation: 'Akumulasi darah telah mencapai minimal 24 jam. Saat kondisi kering, wajib mandi dan melaksanakan shalat (berdasarkan qaul as-sahb/al-laqath).',
      };
    }

    return {
      status: 'SUCI',
      statusLabel: 'Suci',
      canPray: true,
      canFast: true,
      mustGhusl: false,
      totalAccumulatedHaidHours: totalBleedingHours,
      currentDayInCycle: dayCount,
      prayerAdvice: 'Laksanakan ibadah shalat dan puasa seperti biasa.',
      explanation: 'Tidak ada darah yang keluar.',
    };
  }

  // Case C: Currently bleeding, within 15 days
  if (dayCount <= 15) {
    // If total bleeding hasn't reached 24 hours yet, it's provisionally Haid (Mauquf)
    const isMauquf = totalBleedingHours < 24;

    return {
      status: 'HAID',
      statusLabel: isMauquf ? 'Haid (Mauquf / Menunggu 24 Jam)' : 'Haid (Sah)',
      canPray: false,
      canFast: false,
      mustGhusl: false,
      totalAccumulatedHaidHours: totalBleedingHours,
      currentDayInCycle: dayCount,
      prayerAdvice: 'Haram shalat dan puasa. Pantau terus durasi dan warna darah.',
      explanation: isMauquf
        ? `Darah baru terakumulasi ${totalBleedingHours} jam. Secara fikih dihukumi haid sementara sampai mencapai 24 jam dalam 15 hari.`
        : `Darah telah memenuhi syarat sah haid (akumulasi $\\ge 24$ jam dan masih dalam batas maksimal 15 hari).`,
    };
  }

  // Case D: Bleeding exceeded 15 days (360 hours) -> ISTIHADHAH
  return evaluateExceededCycle(entries, profile, totalBleedingHours, dayCount);
}

/**
 * Handle bleeding exceeding 15 days based on 4 classic Syafi'i categories
 */
function evaluateExceededCycle(
  entries: BloodEntry[],
  profile: UserProfile,
  totalBleedingHours: number,
  dayCount: number
): EvaluationResult {
  // Check for Tamyiz (distinction between strong and weak blood)
  const strongColors: BloodColor[] = ['aswad', 'ahmar'];
  const weakColors: BloodColor[] = ['asyqar', 'ashfar', 'akdar'];

  const strongEntries = entries.filter((e) => e.color && strongColors.includes(e.color));
  const weakEntries = entries.filter((e) => e.color && weakColors.includes(e.color));

  const hasStrongAndWeak = strongEntries.length > 0 && weakEntries.length > 0;
  const strongHours = strongEntries.reduce((acc, curr) => acc + curr.durationHours, 0);

  // Tamyiz conditions: strong blood >= 24h and <= 15 days, weak blood continuous >= 15 days
  const isMumayyizah = hasStrongAndWeak && strongHours >= 24 && strongHours <= 360;

  if (profile.isFirstCycle) {
    // 1. Mubtadi'ah Mumayyizah
    if (isMumayyizah) {
      return {
        status: 'ISTIHADHAH',
        statusLabel: 'Istihadhah (Mubtadi\'ah Mumayyizah)',
        canPray: true,
        canFast: true,
        mustGhusl: true,
        totalAccumulatedHaidHours: totalBleedingHours,
        currentDayInCycle: dayCount,
        istihadhahCategory: 'mubtadi_ah_mumayyizah',
        prayerAdvice: 'Mandi besar untuk darah kuat yang telah usai. Hari darah lemah ini dihukumi istihadhah (wajib shalat).',
        explanation: `Darah kuat (${strongHours} jam) dihukumi haid. Darah lemah berikutnya dihukumi istihadhah.`,
      };
    }

    // 2. Mubtadi'ah Ghayru Mumayyizah
    return {
      status: 'ISTIHADHAH',
      statusLabel: 'Istihadhah (Mubtadi\'ah Ghayru Mumayyizah)',
      canPray: true,
      canFast: true,
      mustGhusl: true,
      totalAccumulatedHaidHours: totalBleedingHours,
      currentDayInCycle: dayCount,
      istihadhahCategory: 'mubtadi_ah_ghayru_mumayyizah',
      prayerAdvice: 'Haid Anda ditetapkan 1 hari 1 malam (24 jam) di awal. Sisanya dihukumi istihadhah (wajib qadha shalat sejak hari ke-2).',
      explanation: 'Karena darah seragam dan melebihi 15 hari pada wanita pemula, haidnya adalah minimal haid (24 jam).',
    };
  }

  // Mu'tadah (Experienced woman)
  if (isMumayyizah) {
    // 3. Mu'tadah Mumayyizah (Tamyiz takes precedence over Habit)
    return {
      status: 'ISTIHADHAH',
      statusLabel: 'Istihadhah (Mu\'tadah Mumayyizah)',
      canPray: true,
      canFast: true,
      mustGhusl: true,
      totalAccumulatedHaidHours: totalBleedingHours,
      currentDayInCycle: dayCount,
      istihadhahCategory: 'mu_tadah_mumayyizah',
      prayerAdvice: 'Kekuatan darah mendahului kebiasaan. Darah kuat = haid, darah lemah = istihadhah.',
      explanation: `Haid Anda ditetapkan sesuai durasi darah kuat (${strongHours} jam).`,
    };
  }

  // 4. Mu'tadah Ghayru Mumayyizah (Returns to previous habitual cycle)
  const habitDays = profile.usualHaidDays || 7;
  return {
    status: 'ISTIHADHAH',
    statusLabel: 'Istihadhah (Mu\'tadah Ghayru Mumayyizah)',
    canPray: true,
    canFast: true,
    mustGhusl: true,
    totalAccumulatedHaidHours: totalBleedingHours,
    currentDayInCycle: dayCount,
    istihadhahCategory: 'mu_tadah_ghayru_mumayyizah',
    prayerAdvice: `Darah kembali ke kebiasaan (${habitDays} hari haid). Hari ke-${habitDays + 1} dan seterusnya adalah istihadhah (wajib shalat).`,
    explanation: `Karena darah melewati 15 hari tanpa tamyiz, haid dikembalikan ke siklus bulan lalu (${habitDays} hari). Wajib mengqadha shalat dari hari ke-${habitDays + 1} sampai hari ke-15.`,
  };
}

/**
 * Handle Nifas bleeding (max 60 days, ghalib 40 days)
 */
function evaluateNifas(entries: BloodEntry[]): EvaluationResult {
  const dayCount = entries.length > 0 ? entries.length : 1;
  const latestEntry = entries[entries.length - 1];

  if (!latestEntry || !latestEntry.hasBlood) {
    return {
      status: 'SUCI',
      statusLabel: 'Suci dari Nifas',
      canPray: true,
      canFast: true,
      mustGhusl: true,
      totalAccumulatedHaidHours: 0,
      currentDayInCycle: dayCount,
      prayerAdvice: 'Wajib mandi besar nifas dan menunaikan shalat.',
      explanation: 'Darah nifas telah terputus bersih.',
    };
  }

  if (dayCount <= 60) {
    return {
      status: 'NIFAS',
      statusLabel: `Nifas (Hari ke-${dayCount})`,
      canPray: false,
      canFast: false,
      mustGhusl: false,
      totalAccumulatedHaidHours: 0,
      currentDayInCycle: dayCount,
      prayerAdvice: 'Haram shalat dan puasa. Pantau hingga maksimal 60 hari.',
      explanation: `Darah keluar pascamelahirkan dan masih berada dalam rentang maksimal nifas (60 hari).`,
    };
  }

  // Exceeded 60 days -> Istihadhah
  return {
    status: 'ISTIHADHAH',
    statusLabel: 'Istihadhah Nifas (Melebihi 60 Hari)',
    canPray: true,
    canFast: true,
    mustGhusl: true,
    totalAccumulatedHaidHours: 0,
    currentDayInCycle: dayCount,
    prayerAdvice: 'Mandi besar di hari ke-61, lalu wajib shalat dengan bersuci setiap masuk waktu.',
    explanation: 'Darah nifas telah melampaui batas maksimal syar\'i (60 hari 60 malam).',
  };
}
