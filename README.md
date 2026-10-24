# Thaharah & Mahid (HaidCare) 🌸
### Digital Fiqh Jurisprudence Application for Muslimah (Madzhab Asy-Syafi'i)

A modern, clinically tested web application designed to help Muslim women navigate the jurisprudence and calculation of **Haid (Menstruation)**, **Nifas (Postpartum bleeding)**, and **Istihadhah (Irregular bleeding)** with 100% adherence to the **Shafi'i Mazhab**.

---

## ✨ Fitur Utama (Core Features)

1. **Pelacak Harian & State Machine Fikih**:
   - Pemilahan 5 warna darah Syafi'i (*Aswad, Ahmar, Asyqar, Ashfar, Akdar*) dengan hierarki Tamyiz.
   - Evaluasi otomatis status ibadah: Shalat Fardhu (Wajib/Haram), Puasa Ramadhan (Sah/Qadha), dan Mandi Wajib (*Ghusl*).
   - Kaidah *At-Talfiq* (*Qaul As-Sahbu & Qaul Al-Laqathu*) untuk darah yang keluar terputus-putus dalam batas 15 hari.
2. **HaidCare Assessment Wizard**:
   - Alur tanya-jawab 5-langkah yang empatik dan mudah dipahami untuk membantu muslimah saat menghadapi darah yang membingungkan.
3. **Kalkulator Idrakul Waqti & Qadha Shalat**:
   - Menghitung secara otomatis apakah shalat fardhu wajib diqadha ketika darah mulai keluar atau berhenti bersih menjelang habisnya waktu shalat (termasuk aturan jamak ta'khir Dzuhur-Ashar & Maghrib-Isya).
4. **Penyimpanan Lokal Mandiri (Persistence & Privacy-First)**:
   - Seluruh catatan tersimpan langsung di *LocalStorage* browser Anda tanpa server eksternal demi menjaga privasi penuh.
   - Ekspor cadangan file JSON dengan 1 klik.
5. **Audit Mesin Fikih (54 Uji Klinis Terverifikasi)**:
   - Teruji secara otomatis dengan 54 unit test dan 300 simulasi acak (*property-based testing*) berbasis aljabar interval setengah terbuka $[start, end)$.

---

## 📚 Landasan Fikih & Rujukan Kitab

- *Safinatun Najah* karya Syaikh Salim bin Sumair al-Hadhrami
- *Fathul Qarib al-Mujib* karya Syaikh Muhammad bin Qasim al-Ghazi
- *Al-Majmu' Syarah al-Muhadzdzab* karya Imam An-Nawawi
- *Risalatul Mahid* karya K.H. Muhammad Ardani / Syaikh Mas'ud bin Mas'ud al-Kandani

---

## 🚀 Menjalankan Secara Lokal

```bash
# Clone repository
git clone https://github.com/<username>/<repo-name>.git
cd haid-app

# Pasang dependensi
npm install

# Jalankan rangkaian uji fikih
npm test

# Jalankan server lokal
npm run dev
```

---

## 🌐 Deploy ke GitHub Pages

Proyek ini telah dilengkapi dengan GitHub Actions di `.github/workflows/deploy.yml`. Cukup aktifkan **GitHub Pages** di menu **Settings > Pages > Build and deployment (Source: GitHub Actions)** pada repository Anda, dan aplikasi akan ter-host secara otomatis setiap kali Anda melakukan push ke branch `main`.
