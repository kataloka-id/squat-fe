# Dokumentasi Perubahan: Katalog Section per Proyek

## Ringkasan

Perubahan yang masih berada di worktree frontend dan backend mengubah katalog **Section** dari data global menjadi data yang dimiliki oleh setiap proyek. Test case tidak lagi hanya menyimpan nama section, melainkan merujuk ke `sectionId` milik katalog section pada proyeknya.

Perubahan ini harus dirilis secara terkoordinasi karena mencakup kontrak API baru, perubahan otorisasi akses katalog section, dan migrasi database.

## Perilaku utama

### Katalog Section per proyek

- Setiap proyek memiliki katalog section sendiri.
- Proyek baru otomatis memiliki section fallback `Uncategorized`.
- CRUD section tersedia melalui konteks proyek yang sedang dipilih.
- Pengguna yang memiliki akses ke proyek dapat mengelola katalog section proyek tersebut; akses tetap diverifikasi di backend.
- Penghapusan section ditolak apabila section itu masih digunakan oleh test case.
- Saat nama section diubah, nama section legacy pada test case terkait ikut disinkronkan.

### Form dan daftar test case

- Pembuatan dan pembaruan test case menggunakan `sectionId`.
- Form memuat katalog section ketika proyek berubah, mengosongkan pilihan lama, mencegah submit saat katalog belum valid, serta menyediakan aksi coba lagi jika pemuatan gagal.
- Respons balapan saat pengguna cepat mengganti proyek ditangani agar section dari proyek lama tidak tampil keliru.
- Saat mengubah test case, proyek dikunci untuk menjaga relasi section tetap konsisten.
- Kolom nama section lama tetap dikembalikan API untuk kompatibilitas baca, sedangkan relasi kanoniknya adalah `sectionId`.
- Import masih menerima nama section; backend mencocokkannya tanpa membedakan huruf besar/kecil dalam proyek tujuan dan menyimpan `sectionId`.

### Penyempurnaan antarmuka terkait

- Halaman Settings memilih katalog section berdasarkan proyek aktif.
- Project Key tidak dapat diubah saat edit proyek; saat membuat proyek nilainya tetap diubah menjadi huruf besar.
- Sidebar menampilkan avatar inisial, nama, peran, dan perusahaan pengguna; tampilan ringkas memiliki tooltip.
- Editor Markdown memiliki tab Write/Preview yang aksesibel, menjaga selection pada toolbar, mendukung format baris/list/quote, dan tetap mencegah HTML atau tautan tidak aman saat render.
- Judul test case menggunakan input teks biasa, bukan editor Markdown; modal form juga mendapat penyesuaian lebar dan grid.

## Kontrak API

| Area | Kontrak sebelumnya | Kontrak baru |
| --- | --- | --- |
| Daftar/CRUD section | `/v1/sections` | `/v1/projects/:projectId/sections` |
| Input create/update test case | `section` berupa nama section | `sectionId` berupa UUID |
| Respons test case | `section` | `section` dan `sectionId` |
| Respons section | tanpa konteks proyek | menyertakan `projectId` |

Endpoint global dan payload create/update test case yang masih memakai `section` tidak kompatibel dengan perubahan ini. Pengecualian: endpoint import tetap menerima `testCases[].section` berupa nama section, kemudian backend mengonversinya menjadi `sectionId`. Frontend dan backend perlu dipromosikan bersama.

## Perubahan database

Migrasi baru `22022036_project_section_catalog` menambahkan:

- `tms.sections.project_id`, indeks, dan unique constraint nama section tanpa membedakan kapitalisasi di dalam satu proyek.
- `tms.test_cases.section_id` beserta foreign key dan indeks.
- Backfill relasi section untuk test case dan seed `Uncategorized` per proyek bila diperlukan.
- Penghapusan indeks global `sections_name_ci_key`, lalu pengarsipan seluruh row katalog global tanpa `project_id` ke `tms.legacy_sections_unmapped` sebelum row tersebut dihapus dari `tms.sections`.

Migrasi belum boleh diterapkan tanpa persetujuan rollout. Ini adalah perubahan destruktif terbatas terhadap katalog global aktif dan tidak menyediakan migration down otomatis. Jalankan dry-run pada salinan database, verifikasi jumlah row arsip dan row sumber, siapkan backup serta rollback yang dijalankan operator (restore atau rekonstruksi), dan periksa lebih dahulu kemungkinan nama section dengan variasi kapitalisasi pada proyek yang sama.

## Area kode yang berubah

### Frontend (`squat-fe`)

- Kontrak dan layanan API: `src/api/projects.service.ts`, `src/types/api.ts`.
- Halaman serta form test case/proyek: `src/pages/ProjectsTestCasesPage.tsx` dan `src/components/projectsTestCases/`.
- Katalog section pada Settings: `src/components/settings/SettingsPage.tsx`.
- Sidebar dan Markdown UI beserta pengujiannya.

### Backend (`kataloka-main-be`)

- Skema Prisma dan migrasi katalog section per proyek.
- Controller proyek, section, dan test case; validasi import/test case; route v1; serta normalisasi error constraint.
- Pengujian controller, validasi, dan migrasi.

## Validasi yang perlu dijalankan sebelum merge

- Frontend: jalankan test, typecheck, dan lint yang tersedia; uji manual CRUD section untuk beberapa proyek/role, perpindahan proyek cepat pada form test case, retry error, dan editor Markdown.
- Backend: jalankan build, lint, validasi Prisma, test controller/validasi/migrasi, lalu uji integrasi endpoint scoped project dan penolakan `sectionId` dari proyek lain.
- Integrasi: pastikan frontend tidak lagi mengakses endpoint section global atau mengirim `section` pada create/update test case.
- Database: dry-run migrasi pada salinan database sebelum rollout; jangan menjalankan migrasi produksi dalam pekerjaan ini.

## Risiko dan catatan rilis

- Ini adalah perubahan breaking untuk klien lama yang memanggil endpoint section global atau mengirim `section` pada create/update test case. Payload import berbasis nama section tetap didukung.
- Perubahan hak akses katalog section harus ditinjau sebagai perubahan otorisasi berbasis akses proyek.
- Test case legacy yang tidak memiliki section dapat tetap memiliki `section_id` kosong sampai ditangani melalui kebijakan data lanjutan.
- Karena ada kontrak API dan migrasi, perubahan memerlukan review independen integrasi dan database sebelum merge.
