# Prompt desain — Test Runs dan Reports

Dokumen ini dibuat dari peninjauan codebase frontend `squat-fe` dan backend
`kataloka-main-be` pada 17 Agustus 2026. Salin bagian **Prompt untuk ChatGPT**
di bawah ke chat baru untuk meminta rancangan halaman.

## Kondisi produk yang sudah ada

- Aplikasi adalah workspace QA multi-proyek bernama Kataloka, dengan sidebar
  gelap di kiri, konten putih/abu-slate, aksen brand indigo, kartu ber-radius,
  dan ikon Lucide.
- Sidebar sudah memiliki menu **Projects**, **Test Cases**, **User Flows**,
  **Test Runs**, **Reports**, **Team**, dan **Settings**.
- Test Runs dan Reports saat ini masih memakai satu layar *Under Development*;
  belum ada layar, service frontend, route API, controller backend, model
  database, atau migration khusus untuk keduanya.
- Kartu Project telah memiliki aksi menuju Test Runs dan Reports. Saat ini aksi
  tersebut belum meneruskan proyek yang dipilih; desain perlu secara eksplisit
  menyediakan pemilih proyek dan menjelaskan perilaku saat masuk dari kartu
  proyek.
- Data yang sudah tersedia per proyek: identitas proyek (nama, key, status,
  lead, due date), daftar dan detail test case (TC number, judul, section,
  folder, priority, status Draft/Ready/Review/Deprecated, automation type,
  automation readiness, langkah, tag), dan User Flows (flow key, health,
  priority, status, coverage, linked test cases, last tested at).
- Hak akses sudah berbasis proyek: admin dapat semua proyek, pengguna lain hanya
  proyek yang ditugaskan. Desain tidak boleh menyarankan akses lintas proyek
  tanpa otorisasi.
- Angka `pass rate` yang kini muncul di kartu Project belum berasal dari Test
  Run; jangan jadikan angka contoh desain sebagai fakta produk.

## Prompt untuk ChatGPT

```text
Anda adalah Senior Product Designer untuk aplikasi web B2B QA bernama Kataloka.
Saya memerlukan rancangan UX/UI desktop-first yang konsisten untuk dua halaman
baru: Test Runs dan Reports. Berikan hasil dalam bahasa Indonesia.

Konteks aplikasi saat ini:
- Workspace QA multi-proyek.
- Navigasi sidebar kiri berwarna slate gelap; menu: Projects, Test Cases, User
  Flows, Test Runs, Reports, Team, Settings.
- Visual yang ada: Tailwind-like UI, latar konten slate sangat muda, card putih,
  border slate tipis, radius 8–16 px, aksen indigo/brand, ikon Lucide.
- Semua data dan akses harus dibatasi pada proyek yang pengguna boleh akses.
- Dari kartu Project terdapat aksi menuju Test Runs/Reports. Saat pengguna masuk
  dari sana, proyek tersebut harus otomatis terpilih. Saat masuk dari sidebar,
  tampilkan project selector yang jelas dan aman untuk kondisi belum memilih
  proyek.
- Saat ini belum ada API maupun data riwayat eksekusi nyata. Gunakan data contoh
  yang diberi label jelas sebagai mockup; jangan mengasumsikan metrik, ekspor,
  jadwal, atau integrasi sudah tersedia.

Tujuan Test Runs:
Memungkinkan QA membuat, melihat, memfilter, menjalankan, dan meninjau hasil
eksekusi sekumpulan test case dalam satu proyek. Test case yang tersedia
memiliki: TC number, judul, section/folder, priority, status Draft/Ready/Review/
Deprecated, automation type (UI/API/Manual), automation readiness, langkah, dan
tags. User Flows dapat ditautkan ke test case serta memiliki health dan coverage.

Tujuan Reports:
Membantu QA lead memahami kualitas rilis/proyek dari hasil Test Runs, tanpa
menyembunyikan keterbatasan data. Report harus dapat difilter dan dapat membawa
pengguna kembali ke daftar/hasil test run yang mendasari metrik.

Tugas desain:
1. Rancang struktur informasi, layout desktop, dan interaksi utama untuk:
   a. halaman daftar Test Runs;
   b. halaman detail/eksekusi satu Test Run;
   c. halaman Reports tingkat proyek.
2. Berikan wireframe tekstual atau ASCII yang ringkas untuk ketiga halaman,
   lalu spesifikasi setiap area: header, breadcrumb, project selector, toolbar,
   filter, tabel/list, kartu metrik, chart placeholder, empty/loading/error
   states, dan panel/detail bila relevan.
3. Untuk Test Runs, rekomendasikan alur minimum berikut:
   - daftar run dengan pencarian, filter status, type, owner, dan rentang waktu;
   - CTA “Buat Test Run” yang membuka form sederhana;
   - pemilihan test case dari proyek aktif, dengan filter section/folder, tag,
     priority, dan automation type;
   - status run yang mudah dipindai (contoh: Draft, In Progress, Completed,
     Blocked — sebutkan bahwa ini usulan untuk dikonfirmasi produk);
   - detail run dengan progress, ringkasan hasil, daftar test case, hasil per
     test case (Passed/Failed/Blocked/Skipped/Untested sebagai usulan), assignee,
     durasi, catatan/evidence placeholder, dan navigasi next/previous;
   - jelaskan perilaku untuk test case Draft/Deprecated agar tidak terjadi
     eksekusi tak sengaja.
4. Untuk Reports, rekomendasikan dashboard yang memiliki:
   - selector proyek dan rentang waktu;
   - filter test run, section/folder, tag, priority, automation type, dan
     assignee bila data tersedia;
   - KPI: total test case yang dieksekusi, pass/fail/blocked/skipped/untested,
     pass rate, progress eksekusi, dan tren (semuanya ditandai sebagai usulan
     metrik yang bergantung pada data run);
   - visual yang benar-benar membantu: distribusi status, tren hasil dari waktu
     ke waktu, breakdown per section/folder, priority, dan automation type;
   - daftar “Perlu perhatian” yang menaut ke failure/blocked test case atau run;
   - drill-down yang menjaga filter aktif ketika kembali ke Test Runs.
5. Tentukan hierarchy, copy UI berbahasa Indonesia, label tombol, tooltip,
   empty states, loading states, error states, dan state tanpa proyek yang
   dipilih. Jaga copy ringkas, profesional, dan mudah dipahami QA manual maupun
   automation engineer.
6. Sertakan aturan aksesibilitas penting: fokus keyboard yang terlihat, label
   untuk filter/chart, jangan hanya memakai warna untuk status, kontras memadai,
   target klik yang layak, dan tabel responsif.
7. Buat rekomendasi responsif singkat untuk tablet/mobile: sidebar berubah,
   filter menjadi drawer, tabel menjadi card/list, KPI tetap mudah dibaca.
8. Pisahkan dengan tegas:
   - “MVP desain yang dapat dibangun dari data run dasar”,
   - “Fase lanjutan yang memerlukan keputusan/API baru” (misalnya ekspor PDF/CSV,
     scheduled report, baseline/compare release, integrasi issue tracker,
     bukti lampiran, dan notifikasi).
9. Akhiri dengan daftar pertanyaan keputusan produk yang harus dijawab sebelum
   implementasi backend/frontend, minimal mencakup: definisi status run dan
   result case; siapa yang boleh membuat/mengedit/menutup run; apakah run bisa
   memuat test case yang berubah setelah run dibuat; definisi pass rate; timezone
   dan tanggal report; retention/audit; serta hak ekspor.

Jangan membuat kode. Jangan mengklaim endpoint atau database sudah ada. Fokus
pada desain yang realistis, dapat diimplementasikan bertahap, dan konsisten
dengan pola aplikasi yang sudah dijelaskan.
```

## Referensi implementasi yang mendasari prompt

| Area | Status saat ini |
| --- | --- |
| Navigasi frontend | Menu dan navigasi `runs`/`reports` sudah ada, tetapi keduanya dirender sebagai placeholder. |
| Navigasi dari Project | Aksi Test Runs dan Report ada di kartu proyek; ID proyek belum dipertahankan ketika berpindah. |
| Data sumber | Project, test case, folder/section, attachment, dan user flow tersedia. |
| Backend | Tidak ada endpoint, modul, model Prisma, atau migration untuk Test Runs/Reports. |
| Otorisasi | Service akses proyek sudah dimaksudkan untuk resource masa depan, termasuk Test Runs dan Reports. |

File sumber utama: `src/pages/ProjectsTestCasesPage.tsx`,
`src/components/projectsTestCases/ProjectBoard.tsx`,
`src/components/projectsTestCases/Layout/Sidebar.tsx`,
`src/api/projects.service.ts`, `src/api/user-flows.service.ts`,
`../kataloka-main-be/src/modules/projects/project-access.service.ts`, dan
`../kataloka-main-be/prisma/schema.prisma`.
