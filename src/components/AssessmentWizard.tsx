import { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Info,
  Sparkles
} from 'lucide-react';
import { evaluateFiqhCycle } from '../core/fiqh/fiqh-engine';
import type { BloodEntry, BloodColor, UserProfile, EvaluationResult } from '../core/fiqh/types';

interface AssessmentWizardProps {
  onApplyToTracker: (entries: BloodEntry[], result: EvaluationResult) => void;
}

export default function AssessmentWizard({ onApplyToTracker }: AssessmentWizardProps) {
  const [step, setStep] = useState<number>(0);
  const [reason, setReason] = useState<'return' | 'prolonged' | 'postpartum' | 'unsure'>('return');

  // Step 1: Dates & Timeline
  const [prevStart, setPrevStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d.toISOString().slice(0, 10);
  });
  const [prevEnd, setPrevEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().slice(0, 10);
  });
  const [returnDate, setReturnDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [gapDays, setGapDays] = useState<string>('4');

  // Step 2: Observations during gap & colors
  const [gapObservation, setGapObservation] = useState<'none' | 'purity-sign' | 'spotting' | 'unknown'>('none');
  const [timeCertainty, setTimeCertainty] = useState<'exact' | 'approx' | 'unknown'>('approx');
  const [selectedColors, setSelectedColors] = useState<BloodColor[]>(['ahmar']);

  // Step 3: Habits & Postpartum
  const [habitStatus, setHabitStatus] = useState<'known' | 'irregular' | 'unknown'>('known');
  const [habitDuration, setHabitDuration] = useState<number>(7);
  const [isPostpartum, setIsPostpartum] = useState<'no' | 'yes' | 'unsure'>('no');
  const [deliveryDate, setDeliveryDate] = useState<string>('');

  // Step 5: Computed Result
  const [assessmentResult, setAssessmentResult] = useState<EvaluationResult | null>(null);
  const [generatedEntries, setGeneratedEntries] = useState<BloodEntry[]>([]);

  const handleToggleColor = (color: BloodColor) => {
    if (selectedColors.includes(color)) {
      if (selectedColors.length > 1) {
        setSelectedColors(selectedColors.filter((c) => c !== color));
      }
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const handleRunAssessment = () => {
    // 1. Calculate actual date differences
    const dStart = new Date(prevStart);
    const dEnd = new Date(prevEnd);
    const dReturn = new Date(returnDate);

    // Days bleeding before
    const prevBleedDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    // Days gap without visible blood
    const actualGapDays = Math.max(0, Math.round((dReturn.getTime() - dEnd.getTime()) / (1000 * 60 * 60 * 24)) - 1);

    // Generate synthetic entries to feed the real Claude Fiqh Engine
    const entries: BloodEntry[] = [];
    const primaryColor: BloodColor = selectedColors[0] || 'ahmar';

    // Previous bleeding days
    for (let i = 0; i < prevBleedDays; i++) {
      const curDate = new Date(dStart);
      curDate.setDate(curDate.getDate() + i);
      entries.push({
        id: `prev-${i + 1}`,
        date: curDate.toISOString().slice(0, 10),
        startTime: '06:00',
        durationHours: 24,
        hasBlood: true,
        color: primaryColor,
        intensity: 'medium',
      });
    }

    // Gap days
    for (let i = 0; i < actualGapDays; i++) {
      const curDate = new Date(dEnd);
      curDate.setDate(curDate.getDate() + 1 + i);
      const isSpotting = gapObservation === 'spotting';
      entries.push({
        id: `gap-${i + 1}`,
        date: curDate.toISOString().slice(0, 10),
        startTime: '06:00',
        durationHours: isSpotting ? 6 : 0,
        hasBlood: isSpotting,
        color: isSpotting ? 'ashfar' : undefined,
        intensity: isSpotting ? 'spotting' : undefined,
      });
    }

    // Return bleeding day
    entries.push({
      id: `return-1`,
      date: dReturn.toISOString().slice(0, 10),
      startTime: '06:00',
      durationHours: 24,
      hasBlood: true,
      color: primaryColor,
      intensity: 'medium',
    });

    const userProfile: UserProfile = {
      name: 'Muslimah',
      isFirstCycle: habitStatus === 'unknown',
      usualHaidDays: habitStatus === 'known' ? habitDuration : 7,
      usualPurityDays: 23,
      activeCycleType: isPostpartum === 'yes' ? 'nifas' : 'haid',
    };

    // Run the deterministic Fiqh engine!
    const result = evaluateFiqhCycle(entries, userProfile, actualGapDays);

    setAssessmentResult(result);
    setGeneratedEntries(entries);
    setStep(5);
  };

  const stepLabels = [
    'Mulai Assessment',
    'Konfirmasi Timeline',
    'Pengamatan Jeda',
    'Riwayat Kebiasaan',
    'Ringkasan Data',
    'Hasil Fikih Syafi\'i',
  ];

  return (
    <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-sm overflow-hidden">
      {/* Top Header Assessment */}
      <div className="bg-[#173f35] text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              HaidCare Shafi'i Assessment
            </div>
            <h2 className="text-xl font-bold mt-0.5">Penilaian Mandiri Terpadu</h2>
          </div>
          <div className="text-right">
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full border border-white/10 text-emerald-100">
              {stepLabels[step]} ({step + 1}/6)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-emerald-300 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((step + 1) / 6) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="p-6">
        {/* STEP 0: Reason Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Langkah 1 · Identifikasi Kasus
            </div>
            <h3 className="text-xl font-bold text-slate-900">Apa kondisi yang ingin Anda periksa?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jawab pertanyaan berikut tentang apa yang Anda amati. Sistem akan mengevaluasi apakah informasi Anda
              memenuhi syarat-syarat hukum fikih Madzhab Syafi'i.
            </p>

            <div className="grid grid-cols-1 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setReason('return')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  reason === 'return'
                    ? 'border-[#173f35] bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl p-2 bg-emerald-100/70 rounded-xl">💧</span>
                <div>
                  <div className="font-bold text-sm text-slate-900">Darah keluar kembali</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Setelah beberapa hari tanpa darah (darah terputus-putus / At-Talfiq)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReason('prolonged')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  reason === 'prolonged'
                    ? 'border-[#173f35] bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl p-2 bg-emerald-100/70 rounded-xl">🗓️</span>
                <div>
                  <div className="font-bold text-sm text-slate-900">Darah berlangsung lebih lama</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Melebihi kebiasaan bulanan atau mendekati/melebihi 15 hari (indikasi Istihadhah)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReason('postpartum')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  reason === 'postpartum'
                    ? 'border-[#173f35] bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl p-2 bg-emerald-100/70 rounded-xl">🤱</span>
                <div>
                  <div className="font-bold text-sm text-slate-900">Saya baru melahirkan</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Memeriksa batas waktu dan hukum darah nifas (maksimal 60 hari)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReason('unsure')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  reason === 'unsure'
                    ? 'border-[#173f35] bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl p-2 bg-emerald-100/70 rounded-xl">❔</span>
                <div>
                  <div className="font-bold text-sm text-slate-900">Saya belum yakin</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Bantu saya menganalisis langkah demi langkah dengan panduan terperinci
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Dates & Timeline */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Langkah 2 · Timeline Riwayat
            </div>
            <h3 className="text-xl font-bold text-slate-900">Periksa tanggal yang tercatat</h3>
            <p className="text-xs text-slate-500">
              Pastikan tanggal sesuai fakta pengamatan Anda. Hari jeda tanpa darah belum otomatis suci permanen menurut kaidah *At-Talfiq*.
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Mulai Darah Sebelumnya:
                </label>
                <input
                  type="date"
                  value={prevStart}
                  onChange={(e) => setPrevStart(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Terakhir Darah Terlihat Sebelumnya:
                </label>
                <input
                  type="date"
                  value={prevEnd}
                  onChange={(e) => setPrevEnd(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tanggal Darah Terlihat Kembali:
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Perkiraan Hari Tanpa Darah (Jeda):
                </label>
                <select
                  value={gapDays}
                  onChange={(e) => setGapDays(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="1">1 Hari Kering</option>
                  <option value="2">2 Hari Kering</option>
                  <option value="3">3 Hari Kering</option>
                  <option value="4">4 Hari Kering</option>
                  <option value="5">5 Hari atau lebih</option>
                  <option value="unknown">Saya tidak yakin</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Observations during gap & colors */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Langkah 3 · Pengamatan Selama Jeda
            </div>
            <h3 className="text-xl font-bold text-slate-900">Apa yang Anda amati selama jeda?</h3>
            <p className="text-xs text-slate-500">
              Pilih jawaban yang paling sesuai. Anda tidak perlu menentukan hukumnya sendiri.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Kondisi Saat Jeda:</label>
              <div className="space-y-2">
                {[
                  { id: 'none', label: 'Tidak melihat darah sama sekali (Al-Jufuf / Kering)' },
                  { id: 'purity-sign', label: 'Melihat tanda suci (Cairan putih / Al-Qashshah Al-Baidha)' },
                  { id: 'spotting', label: 'Ada bercak flek atau cairan berwarna sesekali' },
                  { id: 'unknown', label: 'Saya tidak ingat dengan jelas' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      gapObservation === item.id ? 'border-[#173f35] bg-emerald-50/50 font-bold' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gap"
                      checked={gapObservation === item.id}
                      onChange={() => setGapObservation(item.id as any)}
                      className="accent-[#173f35]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <label className="text-xs font-bold text-slate-700 block mt-4">
                Seberapa Yakin Anda dengan Waktu Terjadinya?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'exact', label: 'Tahu Pasti Tanggal & Jam' },
                  { id: 'approx', label: 'Tahu Perkiraan Saja' },
                  { id: 'unknown', label: 'Tidak Yakin / Lupa' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTimeCertainty(item.id as any)}
                    className={`p-2.5 rounded-xl border text-xs text-center transition-colors ${
                      timeCertainty === item.id ? 'border-[#173f35] bg-emerald-50/50 font-bold' : 'border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-slate-700 block mt-4">
                Warna Darah yang Terlihat (Pilih yang Sesuai untuk Kaidah Tamyiz):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'aswad', name: 'Hitam (Aswad)', hex: '#1e1b18' },
                  { id: 'ahmar', name: 'Merah (Ahmar)', hex: '#b91c1c' },
                  { id: 'asyqar', name: 'Cokelat (Asyqar)', hex: '#854d0e' },
                  { id: 'ashfar', name: 'Kuning (Ashfar)', hex: '#ca8a04' },
                  { id: 'akdar', name: 'Keruh (Akdar)', hex: '#78716c' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleColor(c.id as BloodColor)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                      selectedColors.includes(c.id as BloodColor)
                        ? 'border-[#173f35] bg-emerald-50/50 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Habits & Postpartum */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Langkah 4 · Riwayat Kebiasaan (Adat)
            </div>
            <h3 className="text-xl font-bold text-slate-900">Apakah Anda mengetahui kebiasaan haid?</h3>
            <p className="text-xs text-slate-500">
              Kaidah Fikih Syafi'i merujuk pada *Adat* (kebiasaan) jika darah melewati 15 hari tanpa ada perbedaan sifat darah (*Ghayru Mumayyazah*).
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { id: 'known', label: 'Saya tahu kebiasaan saya (siklus teratur)' },
                  { id: 'irregular', label: 'Kebiasaan saya berubah-ubah' },
                  { id: 'unknown', label: 'Saya pemula (Mubtadi\'ah) atau tidak punya catatan' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      habitStatus === item.id ? 'border-[#173f35] bg-emerald-50/50 font-bold' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="habit"
                      checked={habitStatus === item.id}
                      onChange={() => setHabitStatus(item.id as any)}
                      className="accent-[#173f35]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {habitStatus === 'known' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Berapa Hari Kebiasaan Haid Anda Biasanya?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={habitDuration}
                    onChange={(e) => setHabitDuration(Number(e.target.value))}
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Apakah Anda sedang dalam masa nifas (setelah melahirkan)?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPostpartum('no')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isPostpartum === 'no' ? 'border-[#173f35] bg-emerald-50 text-[#173f35] font-bold' : 'border-slate-200'
                    }`}
                  >
                    Tidak
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPostpartum('yes')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isPostpartum === 'yes' ? 'border-[#173f35] bg-emerald-50 text-[#173f35] font-bold' : 'border-slate-200'
                    }`}
                  >
                    Ya (Pascamelahirkan)
                  </button>
                </div>
              </div>

              {isPostpartum === 'yes' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Melahirkan:
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Summary Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Langkah 5 · Ringkasan Pengamatan
            </div>
            <h3 className="text-xl font-bold text-slate-900">Periksa ringkasan sebelum evaluasi</h3>
            <p className="text-xs text-slate-500">
              Pastikan seluruh pengamatan telah sesuai sebelum sistem kalkulasi Fikih Syafi'i dijalankan.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Kategori Kasus:</span>
                <span className="font-bold capitalize">{reason}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Rentang Tanggal:</span>
                <span className="font-bold">{prevStart} s/d {returnDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Pengamatan Saat Jeda:</span>
                <span className="font-bold capitalize">{gapObservation} ({gapDays} hari, keyakinan: {timeCertainty})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Warna Darah:</span>
                <span className="font-bold capitalize">{selectedColors.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Riwayat Kebiasaan (Adat):</span>
                <span className="font-bold">
                  {habitStatus === 'known' ? `${habitDuration} Hari` : habitStatus}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status Pascamelahirkan:</span>
                <span className="font-bold">{isPostpartum === 'yes' ? `Nifas (${deliveryDate})` : 'Tidak'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Penilaian ini diproses menggunakan aturan deterministik Madzhab Syafi'i (*Fathul Qarib & Al-Majmu'*). 
                Gunakan hasil ini sebagai panduan praktis ibadah Anda.
              </span>
            </div>
          </div>
        )}

        {/* STEP 5: Real Fiqh Engine Results! */}
        {step === 5 && assessmentResult && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Hasil Analisis Fikih Madzhab Syafi'i
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                assessmentResult.status === 'HAID'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : assessmentResult.status === 'SUCI'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 border">
                  {assessmentResult.status}
                </span>
                <span className="text-xs opacity-75 font-medium">
                  Total {assessmentResult.totalAccumulatedHaidHours} Jam Darah
                </span>
              </div>

              <h3 className="text-2xl font-extrabold mt-2">{assessmentResult.statusLabel}</h3>
              <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
                {assessmentResult.explanation}
              </p>

              {/* Legal Checklist */}
              <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-semibold">Shalat Fardhu</div>
                  <div className={`font-bold mt-0.5 ${assessmentResult.canPray ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {assessmentResult.canPray ? 'Wajib' : 'Haram'}
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-semibold">Puasa</div>
                  <div className={`font-bold mt-0.5 ${assessmentResult.canFast ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {assessmentResult.canFast ? 'Sah' : 'Wajib Qadha'}
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-semibold">Mandi Wajib</div>
                  <div className={`font-bold mt-0.5 ${assessmentResult.mustGhusl ? 'text-indigo-700' : 'text-slate-500'}`}>
                    {assessmentResult.mustGhusl ? 'Wajib Mandi' : 'Belum'}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 p-3 bg-white/90 rounded-xl border border-black/5 flex items-start gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Tindakan Ibadah Anda: </strong>
                  {assessmentResult.prayerAdvice}
                </div>
              </div>
            </div>

            {/* Synergize: Apply directly to Tracker & Archive */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-emerald-950">
                  Sinkronkan ke Pelacak & Riwayat Aplikasi?
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Hasil pengamatan ini akan otomatis dimasukkan ke Pelacak Harian Anda agar tersimpan permanen.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplyToTracker(generatedEntries, assessmentResult)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#173f35] hover:bg-[#245b4c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan ke Pelacak</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none p-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          {step < 4 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#173f35] hover:bg-[#245b4c] text-white px-5 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <span>Lanjutkan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleRunAssessment}
              className="flex items-center gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Jalankan Penilaian Fikih</span>
            </button>
          )}

          {step === 5 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ulangi Assessment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
