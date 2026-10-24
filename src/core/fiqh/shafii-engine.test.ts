import { describe, it, expect } from 'vitest';
import {
  SHAFII_RULESET,
  BloodColorLevel,
  calculateCycle,
  deriveAdah,
  qualityOf,
  resolveOverlaps,
  buildTimeline,
  statusAt,
  HOUR_MS,
  DAY_MS,
  MIN_MS,
  type RawBloodEntry,
  type PrayerWindow,
  type ShafiiRuleset,
} from './shafii-engine';

const h = (n: number) => n * HOUR_MS;
const d = (n: number) => n * DAY_MS;
const T0 = Date.UTC(2026, 0, 1);
const at = (rel: number) => T0 + rel;

let seq = 0;
function blood(startRel: number, endRel: number | null, o: Partial<RawBloodEntry> = {}): RawBloodEntry {
  return {
    id: `e${++seq}`,
    startMs: at(startRel),
    endMs: endRel === null ? null : at(endRel),
    color: BloodColorLevel.AHMAR,
    texture: 'RAQIQ',
    odorous: false,
    loggedAtMs: 0,
    ...o,
  };
}

const win = (name: string, startRel: number, endRel: number): PrayerWindow => ({
  name,
  entryMs: at(startRel),
  expiryMs: at(endRel),
});

interface RunOptions {
  entries?: RawBloodEntry[];
  completed?: number[];
  births?: number[];
  windows?: PrayerWindow[];
  now: number;
  rs?: ShafiiRuleset;
}

function run(o: RunOptions) {
  return calculateCycle(
    {
      entries: o.entries ?? [],
      history: { completedHaidMs: o.completed ?? [], birthsMs: (o.births ?? []).map(at) },
      prayerWindows: o.windows ?? [],
      nowMs: at(o.now),
    },
    o.rs ?? SHAFII_RULESET
  );
}

const haidSpans = (r: ReturnType<typeof run>) =>
  r.timeline.filter((s) => s.status === 'HAID').map((s) => [s.startMs - T0, s.endMs - T0]);
const nifasSpans = (r: ReturnType<typeof run>) =>
  r.timeline.filter((s) => s.status === 'NIFAS').map((s) => [s.startMs - T0, s.endMs - T0]);

const rs = SHAFII_RULESET;
const G = rs.ghalibMubtadiahMs;
const MINUTE = MIN_MS;

describe('Shafii Engine - Complete Clinical Suite', () => {
  describe('A. Minimal haid (24 jam terakumulasi)', () => {
    it('1. tepat 24 jam darah seragam adalah haid', () => {
      const r = run({ entries: [blood(0, h(24))], now: d(30) });
      expect(haidSpans(r)).toEqual([[0, h(24)]]);
    });

    it('2. 23 jam 59 menit bukan haid, melainkan istihadhah', () => {
      const r = run({ entries: [blood(0, h(23) + 59 * MINUTE)], now: d(30) });
      expect(haidSpans(r)).toEqual([]);
      expect(r.timeline[0].status).toBe('ISTIHADHAH');
    });

    it('3. flek (2 jam) tidak pernah haid dan mempertahankan kategorinya', () => {
      const r = run({ entries: [blood(0, h(2))], now: d(30) });
      expect(haidSpans(r)).toEqual([]);
      expect(r.episodes[0].category).toBe('MUBTADIAH_GHAYRU_MUMAYYAZAH');
    });
  });

  describe('B. Maksimal haid (15 hari dan malam)', () => {
    it('4. haid dibatasi 15 hari; kelebihannya istihadhah', () => {
      const r = run({
        entries: [
          blood(0, d(10), { color: BloodColorLevel.AHMAR }),
          blood(d(10), d(12), { color: BloodColorLevel.AKDAR }),
          blood(d(12), d(20), { color: BloodColorLevel.AHMAR }),
        ],
        now: d(30),
      });
      expect(haidSpans(r)).toEqual([[0, d(15)]]);
      expect(r.episodes[0].istihadhah).toEqual([{ startMs: at(d(15)), endMs: at(d(20)) }]);
    });
  });

  describe('C. Darah terputus-putus dan talfiq', () => {
    it('5. darah 3 hari, suci 5 hari, darah 4 hari membentuk satu episode', () => {
      const r = run({ entries: [blood(0, d(3)), blood(d(8), d(12))], now: d(30) });
      expect(r.episodes).toHaveLength(1);
      expect(haidSpans(r)).toEqual([[0, G]]);
      expect(r.episodes[0].istihadhah).toEqual([{ startMs: at(d(8)), endMs: at(d(12)) }]);
    });

    it('6. suci 14 hari 23 jam tetap satu episode', () => {
      const start2 = d(16) + h(23);
      const r = run({ entries: [blood(0, d(2)), blood(start2, start2 + d(1))], now: d(40) });
      expect(r.episodes).toHaveLength(1);
    });

    it('7. suci tepat 15 hari memulai episode baru', () => {
      const r = run({ entries: [blood(0, d(2)), blood(d(17), d(18))], now: d(40) });
      expect(r.episodes).toHaveLength(2);
    });
  });

  describe('D. Empat kategori istihadhah', () => {
    it("8. mubtadi'ah ghayru mumayyizah: darah seragam, haid = ghalib", () => {
      const r = run({ entries: [blood(0, d(10))], now: d(30) });
      expect(r.episodes[0].category).toBe('MUBTADIAH_GHAYRU_MUMAYYAZAH');
      expect(haidSpans(r)).toEqual([[0, G]]);
    });

    it("9. mubtadi'ah mumayyizah: darah kuat lalu darah lemah", () => {
      const r = run({
        entries: [
          blood(0, d(2), { color: BloodColorLevel.AHMAR }),
          blood(d(2), d(5), { color: BloodColorLevel.AKDAR }),
        ],
        now: d(30),
      });
      expect(r.episodes[0].category).toBe('MUBTADIAH_MUMAYYAZAH');
      expect(haidSpans(r)).toEqual([[0, d(2)]]);
    });

    it("10. mu'tadah ghayru mumayyizah: adah 5 hari, darah seragam", () => {
      const r = run({ entries: [blood(0, d(10))], completed: [d(5), d(5)], now: d(30) });
      expect(r.episodes[0].category).toBe('MUTADAH_GHAYRU_MUMAYYAZAH');
      expect(haidSpans(r)).toEqual([[0, d(5)]]);
    });

    it("11. mu'tadah mumayyizah mendahulukan tamyiz jika flag aktif", () => {
      const r = run({
        entries: [
          blood(0, d(2), { color: BloodColorLevel.AHMAR }),
          blood(d(2), d(10), { color: BloodColorLevel.AKDAR }),
        ],
        completed: [d(5), d(5)],
        now: d(30),
      });
      expect(r.episodes[0].category).toBe('MUTADAH_MUMAYYAZAH');
      expect(haidSpans(r)).toEqual([[0, d(2)]]);
    });

    it("12. mu'tadah mumayyizah mendahulukan adah jika flag nonaktif", () => {
      const r = run({
        entries: [
          blood(0, d(2), { color: BloodColorLevel.AHMAR }),
          blood(d(2), d(10), { color: BloodColorLevel.AKDAR }),
        ],
        completed: [d(5), d(5)],
        now: d(30),
        rs: { ...rs, mumayyizahOverAdah: false },
      });
      expect(haidSpans(r)).toEqual([[0, d(5)]]);
    });

    it('13. darah kuat kurang dari 24 jam tidak membentuk tamyiz', () => {
      const r = run({
        entries: [
          blood(0, h(20), { color: BloodColorLevel.AHMAR }),
          blood(h(20), h(25), { color: BloodColorLevel.AKDAR }),
        ],
        now: d(30),
      });
      expect(r.episodes[0].category).toBe('MUBTADIAH_GHAYRU_MUMAYYAZAH');
      expect(haidSpans(r)).toEqual([[0, h(25)]]);
    });
  });

  describe('E. Penetapan adah', () => {
    it('14. dua haid sebelumnya yang sama dalam toleransi 1 jam menetapkan adah', () => {
      expect(deriveAdah([d(5), d(5) + 30 * MINUTE], rs)).toEqual({ durationMs: d(5) });
    });

    it('15. selisih melebihi toleransi tidak menetapkan adah', () => {
      expect(deriveAdah([d(5), d(6)], rs)).toBeNull();
    });

    it('16. hanya N haid terakhir yang dibandingkan', () => {
      expect(deriveAdah([d(3), d(5), d(5)], rs)).toEqual({ durationMs: d(5) });
    });

    it('17. satu haid sebelumnya tidak cukup', () => {
      expect(deriveAdah([d(5)], rs)).toBeNull();
    });
  });

  describe('F. Urutan kualitas dan resolusi tumpang tindih', () => {
    it('18. warna mendominasi tekstur dan bau', () => {
      const aswadRaqiq = qualityOf({ color: BloodColorLevel.ASWAD, texture: 'RAQIQ', odorous: false });
      const ahmarTsakhinMuntin = qualityOf({ color: BloodColorLevel.AHMAR, texture: 'TSAKHIN', odorous: true });
      expect(aswadRaqiq > ahmarTsakhinMuntin).toBe(true);
    });

    it('19. entri duplikat yang sama tergabung menjadi satu potongan', () => {
      const out = resolveOverlaps([blood(0, h(5)), blood(0, h(5))], at(h(10)));
      expect(out.map((p) => [p.startMs, p.endMs, p.q])).toEqual([[at(0), at(h(5)), 12]]);
    });

    it('20. catatan yang lebih baru menang atas catatan lama pada rentang yang sama', () => {
      const out = resolveOverlaps(
        [
          blood(0, h(10), { color: BloodColorLevel.AHMAR, loggedAtMs: 1 }),
          blood(0, h(10), { color: BloodColorLevel.AKDAR, loggedAtMs: 2 }),
        ],
        at(h(20))
      );
      expect(out.map((p) => [p.startMs, p.endMs, p.q])).toEqual([[at(0), at(h(10)), 0]]);
    });

    it('21. tumpang tindih parsial dipisah menurut waktu catat, tetangga sama digabung', () => {
      const out = resolveOverlaps(
        [
          blood(0, h(10), { color: BloodColorLevel.AKDAR, loggedAtMs: 1 }),
          blood(h(5), h(15), { color: BloodColorLevel.AHMAR, loggedAtMs: 2 }),
        ],
        at(h(20))
      );
      expect(out.map((p) => [p.startMs, p.endMs, p.q])).toEqual([
        [at(0), at(h(5)), 0],
        [at(h(5)), at(h(15)), 12],
      ]);
    });

    it('22. entri terbuka dipotong sampai waktu sekarang', () => {
      const out = resolveOverlaps([blood(0, null)], at(h(5)));
      expect(out.map((p) => [p.startMs, p.endMs, p.q])).toEqual([[at(0), at(h(5)), 12]]);
    });

    it('23. entri yang mulai setelah waktu sekarang dibuang', () => {
      const out = resolveOverlaps([blood(h(10), h(12))], at(h(5)));
      expect(out).toEqual([]);
    });
  });

  describe('G. Kelahiran dan nifas', () => {
    it('24. kelahiran saat berdarah memisahkan haid sebelum dan nifas sesudah', () => {
      const r = run({ entries: [blood(0, h(48))], births: [h(24)], now: d(30) });
      expect(haidSpans(r)).toEqual([[0, h(24)]]);
      expect(nifasSpans(r)).toEqual([[h(24), h(48)]]);
    });

    it('25. nifas 40 hari jika darah berlanjut', () => {
      const r = run({ entries: [blood(0, d(40))], births: [0], now: d(50) });
      expect(nifasSpans(r)).toEqual([[0, d(40)]]);
    });

    it('26. darah melebihi 60 hari setelah melahirkan menjadi istihadhah paksa', () => {
      const r = run({ entries: [blood(0, d(70))], births: [0], now: d(80) });
      expect(nifasSpans(r)).toEqual([[0, d(60)]]);
      const ist = r.timeline.filter((s) => s.status === 'ISTIHADHAH');
      expect(ist).toHaveLength(1);
      expect(ist[0].startMs).toBe(at(d(60)));
      expect(ist[0].endMs).toBe(at(d(70)));
    });

    it('27. suci kurang dari 15 hari mempertahankan rantai nifas', () => {
      const r = run({ entries: [blood(0, d(10)), blood(d(20), d(30))], births: [0], now: d(40) });
      expect(nifasSpans(r)).toEqual([[0, d(30)]]);
    });

    it('28. suci 15 hari memutus rantai nifas', () => {
      const r = run({ entries: [blood(0, d(10)), blood(d(25), d(30))], births: [0], now: d(40) });
      expect(nifasSpans(r)).toEqual([[0, d(10)]]);
      expect(haidSpans(r)).toEqual([[d(25), d(30)]]);
    });

    it('29. kelahiran kedua di dalam rantai nifas tidak membuat segmen baru atau tumpang tindih', () => {
      const r = run({ entries: [blood(0, d(50))], births: [0, d(10)], now: d(60) });
      expect(nifasSpans(r)).toEqual([[0, d(50)]]);
      expect(haidSpans(r)).toEqual([]);
    });
  });

  describe('H. Pemicu mandi', () => {
    it('30. berakhirnya haid memicu mandi pada akhirnya', () => {
      const r = run({ entries: [blood(0, h(24))], now: d(30) });
      expect(r.ahkam.mandi).toEqual([{ atMs: at(h(24)), cause: 'HAID' }]);
    });

    it('31. berakhirnya nifas memicu mandi pada akhirnya', () => {
      const r = run({ entries: [blood(0, d(40))], births: [0], now: d(50) });
      expect(r.ahkam.mandi).toEqual([{ atMs: at(d(40)), cause: 'NIFAS' }]);
    });

    it('44. darah yang masih berlangsung belum memicu mandi', () => {
      const r = run({ entries: [blood(0, null)], now: h(5) });
      expect(r.ahkam.mandi).toEqual([]);
    });
  });

  describe('I. Kewajiban shalat (ahkam)', () => {
    it('32. istihadhah tidak menggugurkan shalat', () => {
      const r = run({ entries: [blood(h(13), h(20))], windows: [win('Zuhur', h(12), h(15))], now: d(1) });
      expect(r.ahkam.prayers[0].obligated).toBe(true);
      expect(r.ahkam.prayers[0].qadhaIfUnperformed).toBe(false);
    });

    it('33. shalat yang seluruh waktunya di dalam haid gugur', () => {
      const r = run({ entries: [blood(0, h(48))], windows: [win('Zuhur', h(12), h(15))], now: d(3) });
      expect(r.ahkam.prayers[0].obligated).toBe(false);
      expect(r.ahkam.prayers[0].qadhaIfUnperformed).toBe(false);
    });

    it('34. suci saat masuk waktu, lalu berdarah: wajib dan diganti qadha', () => {
      const r = run({ entries: [blood(h(14), h(50))], windows: [win('Zuhur', h(12), h(15))], now: d(3) });
      expect(r.ahkam.prayers[0].obligated).toBe(true);
      expect(r.ahkam.prayers[0].qadhaIfUnperformed).toBe(true);
    });

    it('35. darah berhenti dengan sisa waktu kurang dari takbir: tidak wajib', () => {
      const r = run({ entries: [blood(0, h(24))], windows: [win('Subuh', h(23), h(24) + 500)], now: d(3) });
      expect(r.ahkam.prayers[0].obligated).toBe(false);
    });

    it('36. darah berhenti dengan cukup waktu untuk takbir: wajib', () => {
      const r = run({ entries: [blood(0, h(24))], windows: [win('Subuh', h(23), h(24) + 5000)], now: d(3) });
      expect(r.ahkam.prayers[0].obligated).toBe(true);
      expect(r.ahkam.prayers[0].qadhaIfUnperformed).toBe(true);
    });

    it('37. jendela shalat yang belum masuk tidak dievaluasi wajib', () => {
      const r = run({ entries: [], windows: [win('Asar', d(10), d(10) + h(3))], now: d(1) });
      expect(r.ahkam.prayers[0].obligated).toBe(false);
    });

    it('49. klip waktu: bagian jendela yang belum berlalu tidak ikut menentukan kewajiban', () => {
      const r = run({ entries: [blood(h(20), h(40))], windows: [win('Zuhur', h(12), h(36))], now: h(18) });
      expect(r.ahkam.prayers[0].obligated).toBe(true);
      expect(r.ahkam.prayers[0].qadhaIfUnperformed).toBe(false);
    });
  });

  describe('J. Kasus tepi dan ahkam', () => {
    it('38. log kosong menghasilkan timeline suci', () => {
      const r = run({ now: d(1) });
      expect(r.timeline).toEqual([]);
      expect(r.currentStatus).toBe('SUCI');
      expect(r.provisionalUntilMs).toBeNull();
    });

    it('39. darah yang sedang berlangsung bersifat sementara hingga 15 hari dari mulainya', () => {
      const r = run({ entries: [blood(0, null)], now: h(5) });
      expect(r.provisionalUntilMs).toBe(at(d(15)));
      expect(r.currentStatus).toBe('ISTIHADHAH');
    });

    it('40. input yang sama menghasilkan hasil yang sama', () => {
      const entries = [blood(0, d(3)), blood(d(8), d(12))];
      expect(run({ entries, now: d(30) })).toEqual(run({ entries, now: d(30) }));
    });

    it('41. buildTimeline menolak segmen yang tumpang tindih (invarian I1)', () => {
      expect(() =>
        buildTimeline(
          [
            { startMs: at(0), endMs: at(10), status: 'HAID' },
            { startMs: at(5), endMs: at(12), status: 'NIFAS' },
          ],
          at(20)
        )
      ).toThrow(/I1/);
    });

    it('45. batas segmen bersifat setengah terbuka', () => {
      const r = run({ entries: [blood(0, h(24))], now: d(30) });
      expect(statusAt(r.timeline, at(0))).toBe('HAID');
      expect(statusAt(r.timeline, at(h(24)))).toBe('SUCI');
    });

    it('48. kategori istihadhah tercatat pada segmen timeline', () => {
      const r = run({
        entries: [
          blood(0, d(2), { color: BloodColorLevel.AHMAR }),
          blood(d(2), d(5), { color: BloodColorLevel.AKDAR }),
        ],
        now: d(30),
      });
      const ist = r.timeline.filter((s) => s.status === 'ISTIHADHAH');
      expect(ist).toHaveLength(1);
      expect(ist[0].istihadhahCategory).toBe('MUBTADIAH_MUMAYYAZAH');
    });

    it('43. haid melarang shalat dan puasa; istihadhah tetap ibadah dan wajib wudhu tiap fardhu', () => {
      const r = run({ entries: [blood(0, h(24)), blood(d(20), d(20) + h(5))], now: d(30) });
      const haid = r.ahkam.segments.find((s) => s.status === 'HAID');
      const ist = r.ahkam.segments.find((s) => s.status === 'ISTIHADHAH');
      expect(haid?.fastingQadha).toBe(true);
      expect(haid?.wudhuPerFardhu).toBe(false);
      expect(haid?.prohibited).toContain('SHALAT');
      expect(haid?.prohibited).toContain('PUASA');
      expect(ist?.prohibited).toEqual([]);
      expect(ist?.fastingQadha).toBe(false);
      expect(ist?.wudhuPerFardhu).toBe(true);
    });

    it('47. overflow nifas adalah istihadhah yang wajib wudhu dan tidak dilarang ibadah', () => {
      const r = run({ entries: [blood(0, d(70))], births: [0], now: d(80) });
      const ist = r.ahkam.segments.filter((s) => s.status === 'ISTIHADHAH');
      expect(ist.length > 0).toBe(true);
      for (const s of ist) {
        expect(s.prohibited).toEqual([]);
        expect(s.wudhuPerFardhu).toBe(true);
      }
      const nifas = r.ahkam.segments.find((s) => s.status === 'NIFAS');
      expect(nifas?.prohibited).toContain('SHALAT');
    });
  });

  describe('K. Invarian acak (Property-based tests)', () => {
    function lcg(seed: number) {
      let s = seed >>> 0;
      return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    }

    it('42. 300 log acak menjaga timeline kontigu, haid 24 jam..15 hari, dan nifas dalam 60 hari', () => {
      for (let seed = 1; seed <= 300; seed++) {
        const rnd = lcg(seed);
        const pick = (n: number) => Math.floor(rnd() * n);
        const entries = Array.from({ length: 1 + pick(12) }, () => {
          const start = pick(d(60) / MINUTE) * MINUTE;
          const open = rnd() < 0.1;
          const len = (30 + pick(d(20) / MINUTE)) * MINUTE;
          return blood(start, open ? null : start + len, {
            color: pick(5) as any,
            texture: rnd() < 0.5 ? 'RAQIQ' : 'TSAKHIN',
            odorous: rnd() < 0.5,
            loggedAtMs: pick(1000),
          });
        });
        const births = rnd() < 0.3 ? [pick(d(60) / MINUTE) * MINUTE] : [];
        const r = run({ entries, births, now: d(90) });

        for (let i = 1; i < r.timeline.length; i++) {
          expect(r.timeline[i].startMs).toBe(r.timeline[i - 1].endMs);
        }
        for (const s of r.timeline.filter((s) => s.status === 'HAID')) {
          const len = s.endMs - s.startMs;
          expect(len >= rs.minHaidMs).toBe(true);
          expect(len <= rs.maxHaidMs).toBe(true);
        }
        const nifas = r.timeline.filter((s) => s.status === 'NIFAS');
        if (births.length === 0) expect(nifas).toEqual([]);
        for (const s of nifas) {
          const within = s.startMs >= at(births[0]) && s.endMs <= at(births[0]) + rs.nifasMaxMs;
          expect(within).toBe(true);
        }
      }
    });
  });
});
