import { 
  Droplet, 
  Sparkles, 
  Calendar, 
  HelpCircle, 
  Archive, 
  ShieldCheck, 
  Lightbulb,
  BookOpen
} from 'lucide-react';

export default function UserGuideView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 text-white p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Panduan Lengkap Penggunaan Aplikasi</h2>
            <p className="text-xs text-rose-100 mt-0.5">
              Cara mudah dan praktis memantau darah kewanitaan serta memastikan keabsahan ibadah shalat dan puasa.
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-500" />
              Mencatat Kondisi Darah Harian
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Buka tab <strong>Pelacak Harian</strong> setiap kali Anda melihat perubahan darah:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>
              Pilih <strong>"Ada Darah Keluar"</strong> jika melihat noda atau aliran darah.
            </li>
            <li>
              Pilih warna darah sesuai 5 tingkatan Syafi'iyah: <em>Aswad (Hitam)</em>, <em>Ahmar (Merah)</em>, <em>Asyqar (Cokelat)</em>, <em>Ashfar (Kuning)</em>, atau <em>Akdar (Keruh)</em>.
            </li>
            <li>
              Pilih <strong>"Kering / Bersih (Al-Jufuf)"</strong> jika kapas pembersih keluar bersih tanpa noda.
            </li>
            <li>Klik tombol <strong>"Simpan Catatan Hari Ke-..."</strong>. Data Anda otomatis tersimpan di perangkat.</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-emerald-600" />
              Membaca Status Hukum Ibadah
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Perhatikan kartu status berwarna di bagian atas layar:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
              <strong className="block text-rose-800">Status HAID:</strong>
              Haram shalat dan puasa. Pantau terus akumulasi jam darah (minimal 24 jam dalam rentang 15 hari).
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
              <strong className="block text-emerald-800">Status SUCI:</strong>
              Jika sebelumnya berdarah dan kini kering bersih, <strong>Wajib Mandi Besar</strong> lalu menunaikan shalat.
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
              <strong className="block text-amber-800">Status ISTIHADHAH:</strong>
              Darah penyakit. <strong>Wajib tetap shalat dan puasa</strong>, dengan berwudhu setiap kali masuk waktu shalat fardhu.
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Assessment Fikih (Saat Bingung)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Gunakan tab <strong>Assessment Fikih (HaidCare)</strong> jika Anda mengalami kasus membingungkan:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>Darah berhenti beberapa hari lalu keluar lagi (*At-Talfiq*).</li>
            <li>Darah berlangsung lebih lama dari biasanya (mendekati atau melewati 15 hari).</li>
            <li>Darah setelah persalinan (*Nifas*).</li>
          </ul>
          <p className="text-xs text-slate-500">
            Cukup ikuti 5 langkah pertanyaan mudah, sistem akan menganalisis hukumnya dan hasilnya bisa langsung diterapkan ke catatan Anda dengan 1 klik.
          </p>
        </div>

        {/* Step 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Kalkulator Qadha Shalat (Idrakul Waqti)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kaidah Syafi'iyah menentukan apakah shalat wajib diqadha berdasarkan momen darah masuk atau berhenti:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>
              <strong>Saat Darah Keluar:</strong> Jika waktu shalat sudah berjalan cukup untuk wudhu dan 4 rakaat namun belum shalat, maka shalat tersebut <em>wajib diqadha</em>.
            </li>
            <li>
              <strong>Saat Darah Berhenti (Suci):</strong> Jika suci di waktu Ashar, wajib shalat Ashar <em>dan qadha Dzuhur</em>. Jika suci di waktu Isya, wajib shalat Isya <em>dan qadha Maghrib</em> (karena hubungan jamak ta'khir).
            </li>
          </ul>
        </div>

        {/* Step 5 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-amber-600" />
              Selesaikan & Arsipkan Siklus
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ketika masa haid telah selesai tuntas dan Anda sudah bersuci:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>
              Klik tombol hijau <strong>"Selesaikan & Arsipkan Siklus"</strong> di halaman Pelacak Harian.
            </li>
            <li>
              Siklus akan disimpan permanen ke dalam tab <strong>Riwayat & Arsip</strong> untuk melihat rekam jejak bulanan Anda.
            </li>
            <li>
              Gunakan tombol <strong>"Ekspor Data"</strong> di pojok kanan atas untuk mengunduh salinan cadangan (*backup JSON*).
            </li>
          </ul>
        </div>

        {/* Step 6 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Verifikasi Fikih & Ensiklopedia
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Untuk menambah wawasan ilmu thaharah dan keabsahan hukum:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>
              Buka tab <strong>Ensiklopedia & Glosarium</strong> untuk mempelajari dalil-dalil Al-Qur'an, Hadits, serta istilah fikih turats.
            </li>
            <li>
              Buka tab <strong>Audit Mesin Fikih</strong> untuk melihat hasil 54 pengujian klinis matematis yang menjamin keakuratan perhitungan aplikasi.
            </li>
          </ul>
        </div>
      </div>

      {/* Practical Tips Callout */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl text-emerald-950 text-xs flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-sm mb-1 text-emerald-900 font-bold">Tips Praktis Untuk Muslimah:</strong>
          Jangan terburu-buru mandi besar jika darah baru berhenti beberapa jam dan belum tampak tanda suci 
          (<em>Al-Qashshah Al-Baidha'</em> berupa cairan putih atau <em>Al-Jufuf</em> berupa kapas kering bersih). 
          Selalu periksa celah kewanitaan menjelang waktu shalat fardhu habis untuk memastikan apakah Anda sudah berkewajiban bersuci dan shalat.
        </div>
      </div>
    </div>
  );
}
