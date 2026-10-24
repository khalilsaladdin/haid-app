/* ==========================================================================
 * SHAFI'I FIQH ENGINE (MATHEMATICAL INTERVAL ALGEBRA)
 * Haid, Nifas, and Istihadhah Engine based on Classical Shafi'i Jurisprudence.
 * ========================================================================== */

export const MIN_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export const BloodColorLevel = {
  AKDAR: 0,
  ASHFAR: 1,
  ASYQAR: 2,
  AHMAR: 3,
  ASWAD: 4,
} as const;

export type BloodColorType = typeof BloodColorLevel[keyof typeof BloodColorLevel];

export interface ShafiiRuleset {
  minHaidMs: number;
  maxHaidMs: number;
  minTuhrMs: number;
  nifasMaxMs: number;
  adahThreshold: number;
  adahToleranceMs: number;
  ghalibMubtadiahMs: number;
  mumayyizahOverAdah: boolean;
  takbirMs: number;
}

export const SHAFII_RULESET: ShafiiRuleset = Object.freeze({
  minHaidMs: DAY_MS, // 24 hours
  maxHaidMs: 15 * DAY_MS, // 15 days
  minTuhrMs: 15 * DAY_MS, // 15 days minimum purity
  nifasMaxMs: 60 * DAY_MS, // 60 days max nifas
  adahThreshold: 2,
  adahToleranceMs: HOUR_MS,
  ghalibMubtadiahMs: 6 * DAY_MS,
  mumayyizahOverAdah: true,
  takbirMs: 1_000,
});

/* ==========================================================================
 * 2. INTERVAL ALGEBRA [startMs, endMs)
 * ========================================================================== */
export interface Interval {
  startMs: number;
  endMs: number;
}

export const lengthOf = (i: Interval) => i.endMs - i.startMs;
export const overlapMs = (a: Interval, b: Interval) => Math.max(0, Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs));
export const sumLen = (xs: Interval[]) => xs.reduce((acc, i) => acc + lengthOf(i), 0);

export function intersect(a: Interval, b: Interval): Interval | null {
  const startMs = Math.max(a.startMs, b.startMs);
  const endMs = Math.min(a.endMs, b.endMs);
  return endMs > startMs ? { startMs, endMs } : null;
}

export function normalize(xs: Interval[]): Interval[] {
  const sorted = xs.filter((i) => lengthOf(i) > 0).sort((a, b) => a.startMs - b.startMs);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.startMs <= last.endMs) {
      out[out.length - 1] = { startMs: last.startMs, endMs: Math.max(last.endMs, i.endMs) };
    } else {
      out.push({ startMs: i.startMs, endMs: i.endMs });
    }
  }
  return out;
}

export function subtract(xs: Interval[], ys: Interval[]): Interval[] {
  const cuts = normalize(ys);
  return normalize(xs).flatMap((x) => {
    let pieces = [x];
    for (const y of cuts) {
      pieces = pieces.flatMap((p) => {
        if (overlapMs(p, y) === 0) return [p];
        const left = { startMs: p.startMs, endMs: Math.min(p.endMs, y.startMs) };
        const right = { startMs: Math.max(p.startMs, y.endMs), endMs: p.endMs };
        return [left, right].filter((c) => lengthOf(c) > 0);
      });
    }
    return pieces;
  });
}

/* ==========================================================================
 * 3. BLOOD QUALITY & OVERLAP RESOLUTION
 * ========================================================================== */
export interface RawBloodEntry {
  id: string;
  startMs: number;
  endMs: number | null;
  color: BloodColorType;
  texture?: 'TSAKHIN' | 'RAQIQ';
  odorous?: boolean;
  loggedAtMs?: number;
}

export interface ResolvedPiece extends Interval {
  q: number;
  id?: string;
  entryId?: string;
}

export function qualityOf(e: { color: BloodColorType; texture?: 'TSAKHIN' | 'RAQIQ'; odorous?: boolean }): number {
  return e.color * 4 + (e.texture === 'TSAKHIN' ? 2 : 0) + (e.odorous ? 1 : 0);
}

export function resolveOverlaps(entries: RawBloodEntry[], nowMs: number): ResolvedPiece[] {
  const closed = entries
    .map((e) => ({
      id: e.id,
      loggedAtMs: e.loggedAtMs ?? 0,
      q: qualityOf(e),
      startMs: e.startMs,
      endMs: Math.min(e.endMs ?? nowMs, nowMs),
    }))
    .filter((e) => e.endMs > e.startMs);

  const cuts = [...new Set(closed.flatMap((e) => [e.startMs, e.endMs]))].sort((a, b) => a - b);
  const out: ResolvedPiece[] = [];

  for (let k = 0; k + 1 < cuts.length; k++) {
    const s = cuts[k];
    const t = cuts[k + 1];
    let winner: (typeof closed)[0] | undefined;
    for (const e of closed) {
      if (e.startMs <= s && e.endMs >= t && (!winner || e.loggedAtMs > winner.loggedAtMs)) {
        winner = e;
      }
    }
    if (!winner) continue;

    const last = out[out.length - 1];
    if (last && last.endMs === s && last.q === winner.q) {
      out[out.length - 1] = { ...last, endMs: t };
    } else {
      out.push({ startMs: s, endMs: t, q: winner.q, entryId: winner.id });
    }
  }
  return out;
}

export function splitAtBirths(pieces: ResolvedPiece[], birthsMs: number[]): ResolvedPiece[] {
  return pieces.flatMap((p) => {
    const cuts = birthsMs.filter((b) => b > p.startMs && b < p.endMs).sort((a, b) => a - b);
    const bounds = [p.startMs, ...cuts, p.endMs];
    return bounds.slice(1).map((end, i) => ({ ...p, startMs: bounds[i], endMs: end }));
  });
}

/* ==========================================================================
 * 4. NIFAS EXTRACTION
 * ========================================================================== */
export function extractNifas(pieces: ResolvedPiece[], birthsMs: number[], rs: ShafiiRuleset) {
  const spans: Interval[] = [];
  const overflow: ResolvedPiece[] = [];
  let rest = [...pieces];

  for (const b of [...birthsMs].sort((x, y) => x - y)) {
    const cap = b + rs.nifasMaxMs;
    let cursor = b;
    let insideEnd: number | null = null;
    const taken = new Set<ResolvedPiece>();

    for (const p of rest) {
      if (p.startMs < b) continue;
      if (p.startMs - cursor >= rs.minTuhrMs) break;

      taken.add(p);
      if (p.startMs < cap) insideEnd = Math.min(p.endMs, cap);
      if (p.endMs > cap) overflow.push({ ...p, startMs: Math.max(p.startMs, cap) });
      cursor = p.endMs;
    }

    if (insideEnd !== null) spans.push({ startMs: b, endMs: insideEnd });
    rest = rest.filter((p) => !taken.has(p));
  }

  return { spans: normalize(spans), overflow, rest };
}

/* ==========================================================================
 * 5. ISTIHADHAH: 4 CATEGORIES
 * ========================================================================== */
export type IstihadhahCategory = 
  | 'MUBTADIAH_GHAYRU_MUMAYYAZAH'
  | 'MUBTADIAH_MUMAYYAZAH'
  | 'MUTADAH_GHAYRU_MUMAYYAZAH'
  | 'MUTADAH_MUMAYYAZAH';

export function categoryOf(hasAdah: boolean, mumayyizah: boolean): IstihadhahCategory {
  if (hasAdah) return mumayyizah ? 'MUTADAH_MUMAYYAZAH' : 'MUTADAH_GHAYRU_MUMAYYAZAH';
  return mumayyizah ? 'MUBTADIAH_MUMAYYAZAH' : 'MUBTADIAH_GHAYRU_MUMAYYAZAH';
}

export interface AdahRecord {
  durationMs: number;
}

export function haidCandidate(
  cat: IstihadhahCategory,
  ctx: { start: number; bloodEnd: number; strong: ResolvedPiece[]; adah: AdahRecord | null },
  rs: ShafiiRuleset
): Interval | null {
  const fromStart = (durMs: number): Interval => ({
    startMs: ctx.start,
    endMs: Math.min(ctx.start + Math.min(durMs, rs.maxHaidMs), ctx.bloodEnd),
  });
  const tamyiz = (): Interval => ({
    startMs: Math.min(...ctx.strong.map((p) => p.startMs)),
    endMs: Math.max(...ctx.strong.map((p) => p.endMs)),
  });
  const adahMs = () => {
    if (!ctx.adah) throw new Error("INVARIAN: mu'tadah tanpa adah");
    return ctx.adah.durationMs;
  };

  switch (cat) {
    case 'MUBTADIAH_MUMAYYAZAH':
      return tamyiz();
    case 'MUTADAH_MUMAYYAZAH':
      return rs.mumayyizahOverAdah ? tamyiz() : fromStart(adahMs());
    case 'MUTADAH_GHAYRU_MUMAYYAZAH':
      return fromStart(adahMs());
    case 'MUBTADIAH_GHAYRU_MUMAYYAZAH':
      return fromStart(rs.ghalibMubtadiahMs);
  }
}

export interface EpisodeResolution {
  span: Interval;
  category: IstihadhahCategory;
  haid: Interval | null;
  istihadhah: Interval[];
  provisionalUntilMs: number;
}

export function resolveEpisode(
  pieces: ResolvedPiece[],
  adah: AdahRecord | null,
  rs: ShafiiRuleset,
  forceIstihadhah = false
): EpisodeResolution {
  const start = pieces[0].startMs;
  const bloodEnd = pieces[pieces.length - 1].endMs;
  const window: Interval = { startMs: start, endMs: start + rs.maxHaidMs };

  const inWindow = pieces.flatMap((p) => {
    const i = intersect(p, window);
    return i ? [{ ...p, ...i }] : [];
  });
  const maxQ = Math.max(...inWindow.map((p) => p.q));
  const strong = inWindow.filter((p) => p.q === maxQ);

  const mumayyizah =
    !forceIstihadhah &&
    inWindow.some((p) => p.q < maxQ) &&
    sumLen(strong) >= rs.minHaidMs;

  const category = categoryOf(adah !== null, mumayyizah);
  const span: Interval = { startMs: start, endMs: bloodEnd };
  const provisionalUntilMs = window.endMs;

  if (forceIstihadhah) {
    return {
      span,
      category,
      haid: null,
      istihadhah: pieces.map((p) => ({ startMs: p.startMs, endMs: p.endMs })),
      provisionalUntilMs,
    };
  }

  const candidate = haidCandidate(category, { start, bloodEnd, strong, adah }, rs);
  const haid =
    candidate !== null &&
    pieces.reduce((acc, p) => acc + overlapMs(p, candidate), 0) >= rs.minHaidMs
      ? candidate
      : null;

  return {
    span,
    category,
    haid,
    istihadhah: subtract(pieces, haid ? [haid] : []),
    provisionalUntilMs,
  };
}

/* ==========================================================================
 * 6. CLUSTERING & ADAH DERIVATION
 * ========================================================================== */
export function clusterEpisodes(pieces: ResolvedPiece[], rs: ShafiiRuleset): ResolvedPiece[][] {
  const groups: ResolvedPiece[][] = [];
  for (const p of [...pieces].sort((a, b) => a.startMs - b.startMs)) {
    const cur = groups[groups.length - 1];
    const prev = cur?.[cur.length - 1];
    if (cur && prev && p.startMs - prev.endMs < rs.minTuhrMs) cur.push(p);
    else groups.push([p]);
  }
  return groups;
}

export function deriveAdah(completedMs: number[], rs: ShafiiRuleset): AdahRecord | null {
  if (completedMs.length < rs.adahThreshold) return null;
  const recent = completedMs.slice(-rs.adahThreshold);
  const ref = recent[0];
  return recent.every((d) => Math.abs(d - ref) <= rs.adahToleranceMs) ? { durationMs: ref } : null;
}

export function resolveEpisodes(
  groups: ResolvedPiece[][],
  completedSeedMs: number[],
  rs: ShafiiRuleset
): EpisodeResolution[] {
  const completed = [...completedSeedMs];
  return groups.map((g) => {
    const resolution = resolveEpisode(g, deriveAdah(completed, rs), rs);
    if (resolution.haid) completed.push(lengthOf(resolution.haid));
    return resolution;
  });
}

/* ==========================================================================
 * 7. AHKAM & PRAYERS
 * ========================================================================== */
export type CoreStatus = 'SUCI' | 'HAID' | 'NIFAS' | 'ISTIHADHAH';

export interface TimelineSegment extends Interval {
  status: CoreStatus;
  istihadhahCategory?: IstihadhahCategory;
}

export const HAID_NIFAS_RULE = {
  prohibited: ['SHALAT', 'PUASA', 'THAWAF', 'MENYENTUH_MUSHAF', 'I_TIKAF', 'JIMA'],
  fastingQadha: true,
  wudhuPerFardhu: false,
};

export const STATUS_RULES = {
  SUCI: { prohibited: [] as string[], fastingQadha: false, wudhuPerFardhu: false },
  HAID: HAID_NIFAS_RULE,
  NIFAS: HAID_NIFAS_RULE,
  ISTIHADHAH: { prohibited: [] as string[], fastingQadha: false, wudhuPerFardhu: true },
};

export function mandiTriggers(timeline: TimelineSegment[], nowMs: number) {
  return timeline
    .filter((s) => (s.status === 'HAID' || s.status === 'NIFAS') && s.endMs < nowMs)
    .map((s) => ({ atMs: s.endMs, cause: s.status }));
}

export interface PrayerWindow {
  name: string;
  entryMs: number;
  expiryMs: number;
}

export interface EvaluatedPrayer extends PrayerWindow {
  obligated: boolean;
  qadhaIfUnperformed: boolean;
}

export function evaluatePrayer(
  w: PrayerWindow,
  timeline: TimelineSegment[],
  rs: ShafiiRuleset,
  nowMs: number
): EvaluatedPrayer {
  const win: Interval = { startMs: w.entryMs, endMs: Math.min(w.expiryMs, nowMs) };
  if (lengthOf(win) <= 0) return { ...w, obligated: false, qadhaIfUnperformed: false };

  const blocked = timeline.filter((s) => s.status === 'HAID' || s.status === 'NIFAS');
  const openTime = subtract([win], blocked);
  const obligated = openTime.some((i) => lengthOf(i) >= rs.takbirMs);
  const touchesBlood = blocked.some((b) => overlapMs(b, win) > 0);

  return { ...w, obligated, qadhaIfUnperformed: obligated && touchesBlood };
}

/* ==========================================================================
 * 8. TIMELINE BUILDER & ORCHESTRATOR
 * ========================================================================== */
export function buildTimeline(segs: TimelineSegment[], nowMs: number): TimelineSegment[] {
  if (segs.length === 0) return [];
  const sorted = [...segs].sort((a, b) => a.startMs - b.startMs);
  const out: TimelineSegment[] = [];
  let cursor = sorted[0].startMs;

  for (const s of sorted) {
    if (s.startMs < cursor) throw new Error(`INVARIAN I1 dilanggar pada ${s.startMs}`);
    if (s.startMs > cursor) out.push({ startMs: cursor, endMs: s.startMs, status: 'SUCI' });
    out.push(s);
    cursor = s.endMs;
  }
  if (nowMs > cursor) out.push({ startMs: cursor, endMs: nowMs, status: 'SUCI' });

  const merged: TimelineSegment[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.endMs === s.startMs &&
      last.status === s.status &&
      last.istihadhahCategory === s.istihadhahCategory
    ) {
      merged[merged.length - 1] = { ...last, endMs: s.endMs };
    } else {
      merged.push(s);
    }
  }
  return merged;
}

export function statusAt(timeline: TimelineSegment[], t: number): CoreStatus {
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i].startMs <= t) return timeline[i].status;
  }
  return 'SUCI';
}

export interface CalculationInput {
  entries: RawBloodEntry[];
  history: {
    completedHaidMs: number[];
    birthsMs: number[];
  };
  prayerWindows: PrayerWindow[];
  nowMs: number;
}

export interface CycleCalculationResult {
  currentStatus: CoreStatus;
  timeline: TimelineSegment[];
  episodes: EpisodeResolution[];
  ahkam: {
    segments: Array<TimelineSegment & { prohibited: string[]; fastingQadha: boolean; wudhuPerFardhu: boolean }>;
    mandi: Array<{ atMs: number; cause: CoreStatus }>;
    prayers: EvaluatedPrayer[];
  };
  provisionalUntilMs: number | null;
}

export function calculateCycle(
  input: CalculationInput,
  rs: ShafiiRuleset = SHAFII_RULESET
): CycleCalculationResult {
  const { entries, history, prayerWindows, nowMs } = input;

  const pieces = splitAtBirths(resolveOverlaps(entries, nowMs), history.birthsMs);
  const nifas = extractNifas(pieces, history.birthsMs, rs);
  const episodes = resolveEpisodes(clusterEpisodes(nifas.rest, rs), history.completedHaidMs, rs);

  const completedAll = [
    ...history.completedHaidMs,
    ...episodes.flatMap((e) => (e.haid ? [lengthOf(e.haid)] : [])),
  ];
  const finalAdah = deriveAdah(completedAll, rs);
  const overflowEpisodes = clusterEpisodes(nifas.overflow, rs).map((g) =>
    resolveEpisode(g, finalAdah, rs, true)
  );

  const allEpisodes = [...episodes, ...overflowEpisodes].sort((a, b) => a.span.startMs - b.span.startMs);

  const segments: TimelineSegment[] = [
    ...nifas.spans.map((s) => ({ ...s, status: 'NIFAS' as const })),
    ...allEpisodes.flatMap((e) => [
      ...(e.haid ? [{ ...e.haid, status: 'HAID' as const }] : []),
      ...e.istihadhah.map((i) => ({ ...i, status: 'ISTIHADHAH' as const, istihadhahCategory: e.category })),
    ]),
  ];
  const timeline = buildTimeline(segments, nowMs);

  const ahkam = {
    segments: timeline.map((s) => ({ ...s, ...STATUS_RULES[s.status] })),
    mandi: mandiTriggers(timeline, nowMs),
    prayers: prayerWindows.map((w) => evaluatePrayer(w, timeline, rs, nowMs)),
  };

  const provisional = episodes.map((e) => e.provisionalUntilMs).filter((t) => t > nowMs);

  return {
    currentStatus: statusAt(timeline, nowMs),
    timeline,
    episodes: allEpisodes,
    ahkam,
    provisionalUntilMs: provisional.length ? Math.max(...provisional) : null,
  };
}
