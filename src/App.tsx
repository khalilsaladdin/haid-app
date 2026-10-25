import { useState, useEffect } from 'react';
import { 
  Droplet, 
  BookOpen, 
  Calendar, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Info, 
  ShieldCheck, 
  RotateCcw,
  History,
  Trash2,
  Archive,
  Download,
  ChevronDown,
  ChevronUp,
  FolderClock,
  Lightbulb
} from 'lucide-react';

import fiqhData from './data/fiqh-knowledge.json';
import { evaluateFiqhCycle, calculatePrayerQadha } from './core/fiqh/fiqh-engine';
import type { BloodEntry, BloodColor, UserProfile, FlowIntensity, ArchivedCycle } from './core/fiqh/types';
import AssessmentWizard from './components/AssessmentWizard';
import FiqhVerificationView from './components/FiqhVerificationView';
import UserGuideView from './components/UserGuideView';

export default function App() {
  // User Profile
  const [profile] = useState<UserProfile>({
    name: 'Muslimah',
    isFirstCycle: false,
    usualHaidDays: 7,
    usualPurityDays: 23,
    activeCycleType: 'haid',
  });

  // Load Active Entries from LocalStorage
  const [entries, setEntries] = useState<BloodEntry[]>(() => {
    try {
      const saved = localStorage.getItem('thaharah_active_entries');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load active entries from localStorage', e);
    }
    return [
      {
        id: '1',
        date: new Date().toISOString().slice(0, 10),
        startTime: '06:00',
        durationHours: 24,
        hasBlood: true,
        color: 'ahmar',
        intensity: 'medium',
      },
    ];
  });

  // Load Archived Cycles from LocalStorage
  const [archivedCycles, setArchivedCycles] = useState<ArchivedCycle[]>(() => {
    try {
      const saved = localStorage.getItem('thaharah_archived_cycles');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load archived cycles from localStorage', e);
    }
    return [];
  });

  // Synchronize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('thaharah_active_entries', JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save active entries', e);
    }
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem('thaharah_archived_cycles', JSON.stringify(archivedCycles));
    } catch (e) {
      console.error('Failed to save archived cycles', e);
    }
  }, [archivedCycles]);

  // Current Logger Form State
  const [hasBloodInput, setHasBloodInput] = useState<boolean>(true);
  const [colorInput, setColorInput] = useState<BloodColor>('ahmar');
  const [intensityInput, setIntensityInput] = useState<FlowIntensity>('medium');
  const [durationInput, setDurationInput] = useState<number>(24);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'tracker' | 'guide' | 'assessment' | 'history' | 'wizard' | 'verification' | 'knowledge' | 'glossary'>('tracker');
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApplyFromAssessment = (generatedEntries: BloodEntry[]) => {
    setEntries(generatedEntries);
    setActiveTab('tracker');
    showToast('Hasil Assessment berhasil disinkronkan ke Pelacak Harian Anda!');
  };

  // Wizard state (Qadha calculator)
  const [wizardEvent, setWizardEvent] = useState<'start_bleeding' | 'purified'>('purified');
  const [wizardPrayer, setWizardPrayer] = useState<'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya'>('Ashar');
  const [wizardRemainingMins, setWizardRemainingMins] = useState<number>(15);

  // Evaluate current fiqh status
  const fiqhResult = evaluateFiqhCycle(entries, profile, profile.usualPurityDays);

  const handleAddEntry = () => {
    const newEntry: BloodEntry = {
      id: String(Date.now()),
      date: new Date().toISOString().slice(0, 10),
      startTime: '08:00',
      durationHours: hasBloodInput ? durationInput : 0,
      hasBlood: hasBloodInput,
      color: hasBloodInput ? colorInput : undefined,
      intensity: hasBloodInput ? intensityInput : undefined,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetCycle = () => {
    if (confirm('Kosongkan catatan siklus berjalan saat ini?')) {
      setEntries([]);
    }
  };

  // Archive completed cycle
  const handleArchiveCycle = () => {
    if (entries.length === 0) {
      alert('Belum ada data catatan untuk diarsipkan.');
      return;
    }

    const startDate = entries[0].date;
    const endDate = entries[entries.length - 1].date;
    const totalHaidHours = entries
      .filter((e) => e.hasBlood)
      .reduce((acc, curr) => acc + curr.durationHours, 0);

    const newArchived: ArchivedCycle = {
      id: String(Date.now()),
      startDate,
      endDate,
      totalDays: entries.length,
      totalHaidHours,
      finalStatus: fiqhResult.statusLabel,
      entries: [...entries],
    };

    setArchivedCycles((prev) => [newArchived, ...prev]);
    setEntries([]);
    setActiveTab('history');
  };

  const handleDeleteArchivedCycle = (id: string) => {
    if (confirm('Hapus riwayat siklus ini dari arsip?')) {
      setArchivedCycles((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      activeEntries: entries,
      archivedCycles: archivedCycles,
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat_fikih_haid_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qadhaResult = calculatePrayerQadha(
    wizardEvent,
    wizardPrayer,
    wizardEvent === 'start_bleeding' ? wizardRemainingMins : 0,
    wizardEvent === 'purified' ? wizardRemainingMins : 0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Droplet className="w-7 h-7 text-white fill-white/80" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Thaharah & Mahid</h1>
              <p className="text-xs text-rose-100 flex items-center gap-1">
                <span>Panduan Fikih Haid, Nifas, & Istihadhah</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Madzhab Asy-Syafi'i</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('guide')}
              title="Buka Panduan Lengkap Penggunaan Aplikasi"
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                activeTab === 'guide'
                  ? 'bg-white text-rose-700 border-white shadow-sm'
                  : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Panduan Aplikasi</span>
            </button>
            <button
              onClick={handleExportData}
              title="Cadangkan / Ekspor Data Riwayat"
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Data</span>
            </button>
            <button
              onClick={handleResetCycle}
              title="Reset catatan siklus berjalan"
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Siklus Baru</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto px-4 flex space-x-2 overflow-x-auto pt-2 border-t border-rose-400/30">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pelacak Harian</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>Panduan Penggunaan</span>
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assessment'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Assessment Fikih (HaidCare)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat & Arsip ({archivedCycles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'wizard'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Kalkulator Qadha</span>
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'verification'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            <span>Audit Mesin Fikih (54 Uji)</span>
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ensiklopedia</span>
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'glossary'
                ? 'border-white text-white'
                : 'border-transparent text-rose-100 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Glosarium</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {toastMessage && (
          <div className="mb-4 p-3 bg-emerald-600 text-white rounded-2xl shadow-md text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* USER GUIDE TAB */}
        {activeTab === 'guide' && (
          <UserGuideView />
        )}

        {/* ASSESSMENT TAB (ChatGPTSynergy) */}
        {activeTab === 'assessment' && (
          <AssessmentWizard onApplyToTracker={handleApplyFromAssessment} />
        )}

        {/* TRACKER TAB */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {/* Quick Helper Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-amber-50/80 border border-amber-200/80 px-4 py-2.5 rounded-2xl text-xs text-amber-900 shadow-xs">
              <span className="flex items-center gap-2 font-medium">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Baru pertama kali menggunakan aplikasi? Pelajari cara pencatatan dan membaca status ibadah.</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className="font-bold underline text-amber-900 hover:text-amber-700 whitespace-nowrap text-xs"
              >
                Buka Panduan Lengkap ➔
              </button>
            </div>

            {/* Quick Assessment Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[#173f35] text-white p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-bold">Bingung Status Darah Keluar Kembali atau Melebihi Batas?</div>
                  <div className="text-xs text-emerald-200 mt-0.5">
                    Gunakan panduan 5-langkah HaidCare Assessment yang terhubung langsung ke mesin Fikih Syafi'i.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('assessment')}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-300 hover:bg-emerald-200 text-emerald-950 text-xs font-extrabold rounded-xl transition-colors whitespace-nowrap"
              >
                Mulai Assessment ➔
              </button>
            </div>

            {/* Status Card Banner */}
            <div
              className={`p-6 rounded-3xl border shadow-sm transition-all ${
                fiqhResult.status === 'HAID'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : fiqhResult.status === 'SUCI'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-white/80 shadow-xs border">
                    Status Hukum Fikih (Tersimpan Otomatis)
                  </span>
                  <h2 className="text-3xl font-extrabold mt-2 flex items-center gap-2">
                    {fiqhResult.statusLabel}
                  </h2>
                  <p className="text-sm mt-1 opacity-90">{fiqhResult.explanation}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs opacity-75">Hari ke-</div>
                  <div className="text-2xl font-bold">{fiqhResult.currentDayInCycle}</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {fiqhResult.totalAccumulatedHaidHours} jam darah
                  </div>
                </div>
              </div>

              {/* Legal Checklist (Ahkam) */}
              <div className="mt-5 pt-4 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 bg-white/70 p-3 rounded-xl border border-black/5">
                  {fiqhResult.canPray ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs">Shalat Fardhu</div>
                    <div className="text-xs opacity-80">
                      {fiqhResult.canPray ? 'Wajib Dikerjakan' : 'Haram Dikerjakan'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/70 p-3 rounded-xl border border-black/5">
                  {fiqhResult.canFast ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs">Puasa</div>
                    <div className="text-xs opacity-80">
                      {fiqhResult.canFast ? 'Sah Dikerjakan' : 'Haram (Wajib Qadha)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/70 p-3 rounded-xl border border-black/5">
                  {fiqhResult.mustGhusl ? (
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs">Mandi Wajib</div>
                    <div className="text-xs opacity-80">
                      {fiqhResult.mustGhusl ? 'Wajib Bersuci' : 'Belum Wajib'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Action Advice */}
              <div className="mt-4 p-3 bg-white/80 rounded-xl border border-black/5 flex items-start gap-2.5 text-xs font-medium">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Panduan Ibadah Saat Ini: </span>
                  {fiqhResult.prayerAdvice}
                </div>
              </div>
            </div>

            {/* Daily Blood Logger Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-rose-500" />
                Catat Kondisi Darah Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Catatan ini otomatis tersimpan secara lokal dan aman di browser perangkat Anda.
              </p>

              <div className="mt-5 space-y-4">
                {/* Blood Presence Toggle */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Kondisi Saat Ini:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHasBloodInput(true)}
                      className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        hasBloodInput
                          ? 'border-rose-500 bg-rose-50/50 text-rose-700 font-semibold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      Ada Darah Keluar
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasBloodInput(false)}
                      className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        !hasBloodInput
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 font-semibold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Kering / Bersih (Al-Jufuf)
                    </button>
                  </div>
                </div>

                {hasBloodInput && (
                  <>
                    {/* 5 Shafi'i Colors Selector */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                        Tingkat Warna Darah (Urutan Kekuatan Tamyiz Syafi'i):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {fiqhData.colors_hierarchy.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setColorInput(color.id as BloodColor)}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              colorInput === color.id
                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ backgroundColor: color.color_hex }}
                              ></span>
                              <span className="text-[10px] font-bold text-slate-400">
                                #{color.level}
                              </span>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs font-bold text-slate-800">{color.name}</div>
                              <div className="text-[10px] text-slate-400">{color.arabic}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Flow & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                          Intensitas Aliran:
                        </label>
                        <select
                          value={intensityInput}
                          onChange={(e) => setIntensityInput(e.target.value as FlowIntensity)}
                          className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-rose-500"
                        >
                          <option value="spotting">Bercak / Flek Samar</option>
                          <option value="light">Ringan (Cair / Sedikit)</option>
                          <option value="medium">Sedang (Biasa)</option>
                          <option value="heavy">Deras (Kental / Pekat)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                          Durasi Darah Keluar (Jam):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={durationInput}
                          onChange={(e) => setDurationInput(Number(e.target.value))}
                          className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-rose-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="w-full mt-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Catatan Hari Ke-{entries.length + 1}
                </button>
              </div>
            </div>

            {/* Cycle History Logs in Tracker */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-md font-bold text-slate-900">
                    Catatan Siklus Berjalan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {entries.length} entri ({fiqhResult.totalAccumulatedHaidHours} jam darah)
                  </p>
                </div>
                {entries.length > 0 && (
                  <button
                    onClick={handleArchiveCycle}
                    className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Selesaikan & Arsipkan Siklus</span>
                  </button>
                )}
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada catatan di siklus ini. Masukkan catatan darah di atas.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {entries.map((entry, idx) => (
                    <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        {entry.hasBlood ? (
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="capitalize">{entry.color}</span> ({entry.intensity})
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Durasi: {entry.durationHours} jam
                            </div>
                          </div>
                        ) : (
                          <div className="text-emerald-600 font-medium">Bersih / Kering (Jufuf)</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">{entry.date}</span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Hapus entri ini"
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY & ARCHIVE TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FolderClock className="w-6 h-6 text-rose-500" />
                    Arsip Riwayat Siklus Lengkap
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Semua siklus bulanan yang telah Anda selesaikan disimpan permanen di penyimpanan browser perangkat Anda.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Cadangkan File JSON</span>
                </button>
              </div>

              {archivedCycles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Archive className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Belum ada siklus yang diarsipkan.</p>
                  <p className="text-xs mt-1">
                    Saat siklus haid Anda selesai, klik tombol <strong>"Selesaikan & Arsipkan Siklus"</strong> di halaman Pelacak Harian.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {archivedCycles.map((cycle, index) => {
                    const isExpanded = expandedCycleId === cycle.id;
                    return (
                      <div
                        key={cycle.id}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                              #{archivedCycles.length - index}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                {cycle.startDate} s/d {cycle.endDate}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{cycle.totalDays} Hari</span>
                                <span>•</span>
                                <span>{cycle.totalHaidHours} Jam Darah</span>
                                <span>•</span>
                                <span className="text-rose-600 font-semibold">{cycle.finalStatus}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteArchivedCycle(cycle.id);
                              }}
                              title="Hapus riwayat ini"
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Daily Details */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-slate-200 divide-y divide-slate-100 text-xs">
                            <div className="pb-2 font-semibold text-slate-700">Rincian Hari per Hari:</div>
                            {cycle.entries.map((item, i) => (
                              <div key={item.id} className="py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">Hari {i + 1}:</span>
                                  {item.hasBlood ? (
                                    <span className="font-medium text-slate-800">
                                      {item.color} ({item.intensity}) - {item.durationHours} Jam
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-medium">Bersih / Kering (Jufuf)</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">{item.date}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WIZARD TAB: Prayer Qadha Calculator */}
        {activeTab === 'wizard' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-rose-500" />
                Kalkulator Idrakul Waqti & Qadha Shalat
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ketahui secara pasti apakah shalat Anda wajib diqadha ketika darah baru keluar atau baru berhenti tuntas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  1. Peristiwa Apa yang Baru Saja Terjadi?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWizardEvent('purified')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      wizardEvent === 'purified'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    🌸 Darah Berhenti / Suci (Inqitha'ud Dam)
                  </button>
                  <button
                    onClick={() => setWizardEvent('start_bleeding')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      wizardEvent === 'start_bleeding'
                        ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    🩸 Darah Baru Keluar (Thuru'ul Haid)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    2. Terjadi Pada Waktu Shalat:
                  </label>
                  <select
                    value={wizardPrayer}
                    onChange={(e) => setWizardPrayer(e.target.value as any)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-rose-500"
                  >
                    <option value="Subuh">Subuh</option>
                    <option value="Dzuhur">Dzuhur</option>
                    <option value="Ashar">Ashar</option>
                    <option value="Maghrib">Maghrib</option>
                    <option value="Isya">Isya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    {wizardEvent === 'purified'
                      ? '3. Berapa menit sisa waktu sebelum adzan berikutnya?'
                      : '3. Berapa menit waktu shalat sudah berjalan saat darah keluar?'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={wizardRemainingMins}
                    onChange={(e) => setWizardRemainingMins(Number(e.target.value))}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-rose-500"
                  />
                </div>
              </div>

              {/* Wizard Output Result */}
              <div
                className={`p-5 rounded-2xl border ${
                  qadhaResult.needsQadha
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider">
                  Hasil Analisis Syar'i:
                </div>
                <div className="text-lg font-bold mt-1">
                  {qadhaResult.needsQadha ? (
                    <span>
                      ⚠️ Wajib Mengerjakan / Mengqadha Shalat:{' '}
                      <span className="text-rose-600 underline">
                        {qadhaResult.prayersToQadha.join(' & ')}
                      </span>
                    </span>
                  ) : (
                    <span>✅ Tidak Ada Kewajiban Qadha untuk Waktu Tersebut</span>
                  )}
                </div>
                <p className="text-xs mt-2 opacity-90 leading-relaxed">{qadhaResult.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* VERIFICATION TAB: Audit Mesin Fikih (Claude 54 Tests) */}
        {activeTab === 'verification' && (
          <FiqhVerificationView />
        )}

        {/* KNOWLEDGE TAB: Encyclopedia */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {fiqhData.blood_types.map((type) => (
              <div key={type.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{type.title}</h3>
                    <div className="text-xs text-rose-500 font-semibold">{type.arabic} ({type.transliteration})</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{type.definition}</p>

                {type.boundaries && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {type.boundaries.minimal_hours && (
                      <div>
                        <div className="text-slate-400 text-[10px]">Minimal:</div>
                        <div className="font-bold">{type.boundaries.minimal_hours} Jam</div>
                      </div>
                    )}
                    {type.boundaries.ghalib_days && (
                      <div>
                        <div className="text-slate-400 text-[10px]">Umumnya (Ghalib):</div>
                        <div className="font-bold">{type.boundaries.ghalib_days} Hari</div>
                      </div>
                    )}
                    {type.boundaries.maximal_days && (
                      <div>
                        <div className="text-slate-400 text-[10px]">Maksimal:</div>
                        <div className="font-bold">{type.boundaries.maximal_days} Hari</div>
                      </div>
                    )}
                    {type.boundaries.minimal_purity_days && (
                      <div>
                        <div className="text-slate-400 text-[10px]">Minimal Suci Antara 2 Haid:</div>
                        <div className="font-bold">{type.boundaries.minimal_purity_days} Hari</div>
                      </div>
                    )}
                  </div>
                )}

                {type.prohibitions && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Hal yang Diharamkan:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                      {type.prohibitions.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500">•</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 italic">
                  Dalil: {type.dalil}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GLOSSARY TAB */}
        {activeTab === 'glossary' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Glosarium Fikih Mar'ah</h2>
            <p className="text-xs text-slate-500 mb-4">
              Kamus istilah turats klasik yang disederhanakan untuk muslimah modern.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fiqhData.glossary.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">{item.term}</div>
                    <div className="text-xs font-bold text-rose-600">{item.arabic}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
