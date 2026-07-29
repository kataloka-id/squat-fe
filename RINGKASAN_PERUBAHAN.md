# Ringkasan Perubahan

Dokumen ini merangkum seluruh perubahan lokal yang belum dicommit pada saat pemeriksaan, mencakup repository frontend `squat-fe` dan backend `kataloka-main-be`.

## Tujuan perubahan

Menambahkan dukungan multi-company/tenant: identitas dan profil perusahaan, logo perusahaan yang disimpan aman, pengelolaan perusahaan oleh `kataloka_admin`, serta pembatasan akses pengguna dan role berdasarkan perusahaan.

## Frontend — `squat-fe`

- Menambahkan layanan `CompaniesService` untuk profil perusahaan, logo, detail perusahaan, daftar/perubahan status perusahaan, serta master tipe dan kategori enterprise.
- Menambahkan model API untuk company, detail company, perusahaan terkelola, tipe, dan kategori enterprise.
- Menampilkan identitas perusahaan pada aplikasi: nama dan logo di sidebar, warna merek dinamis, favicon, dan judul halaman.
- Mengubah halaman Settings agar mendukung:
  - profil perusahaan dan pengaturan warna merek;
  - unggah/hapus logo PNG, JPEG, atau WebP dengan batas 2 MB;
  - detail bisnis perusahaan;
  - pembuatan, aktivasi/nonaktif, dan penghapusan perusahaan oleh `kataloka_admin`;
  - pengelolaan master tipe dan kategori enterprise;
  - filter pengguna berdasarkan pencarian dan perusahaan;
  - penugasan user ke perusahaan.
- Membedakan hak UI `kataloka_admin` dan admin perusahaan, termasuk daftar role yang boleh ditugaskan.
- Memperbarui branding halaman login, konfigurasi Tailwind, dan CSS agar mengikuti branding company.
- Menambahkan pengujian unit/komponen untuk layanan company, layanan user, identitas company, sidebar, dan halaman Settings.

## Backend — `kataloka-main-be`

- Menambahkan relasi `company_id` pada user dan data identitas company pada tabel bisnis.
- Menambahkan role global `kataloka_admin`, status arsip/aktif perusahaan, indeks terkait, dan tiga migration baru.
- Menambahkan penyimpanan aset logo perusahaan di database (`company_logo_assets`), menggantikan penggunaan URL logo eksternal.
- Menambahkan API terlindungi untuk:
  - profil, detail, dan logo perusahaan milik user yang sedang login (`/v1/company`);
  - daftar, pembuatan, detail, perubahan status, dan penghapusan perusahaan (`/v1/companies`);
  - CRUD master kategori dan tipe enterprise.
- Menerapkan validasi input, tipe file/magic bytes logo, ukuran file maksimum, header respons logo privat/no-sniff, dan pembatasan akses company aktif.
- Memperluas otorisasi agar admin perusahaan hanya mengelola user di perusahaannya, sedangkan `kataloka_admin` mengelola lintas perusahaan.
- Membatasi role yang dapat ditugaskan, melindungi admin aktif terakhir per perusahaan, dan membatasi assignment project untuk `kataloka_admin`.
- Memperbarui respons autentikasi/user agar menyertakan company; endpoint user mendukung filter `q` dan `companyId`.
- Menambahkan penanganan error domain company dan test untuk auth, company, enterprise, role, user, validasi, serta upload logo.
- Menambahkan skrip lokal untuk backfill company dan promosi akun menjadi `kataloka_admin`.

## Dampak kontrak API/data

- Kontrak user/auth kini dapat memuat objek `company`; pembuatan user dapat menerima `companyId`.
- Endpoint baru: `/v1/company/*`, `/v1/companies/*`, dan `/v1/roles/assignable`.
- Endpoint enterprise type/category kini menyediakan operasi tulis khusus `kataloka_admin`.
- Database membutuhkan migration `22022033`, `22022034`, dan `22022035` secara berurutan sebelum fitur digunakan.

## Catatan status

- Semua perubahan masih berada di working tree (belum staged/committed) pada kedua repository.
- Karena perubahan mencakup kontrak API, otorisasi, dan migration database, frontend dan backend perlu direview serta divalidasi bersama sebelum digabungkan.
