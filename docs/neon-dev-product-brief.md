# Product Brief — Workflow Lokal dengan Neon Branch `dev`

## Latar belakang

Developer menjalankan frontend dan backend di mesin lokal, tetapi backend perlu
terhubung ke database PostgreSQL pada Neon branch `dev`. Workflow tersebut juga
harus mendukung migration schema, seed data, dan provision akun admin development
tanpa menyimpan connection string, JWT secret, atau password di source control.

Saat diuji, login dari frontend lokal menghasilkan `401 AUTH_INVALID_CREDENTIALS`.
Koneksi backend ke Neon sudah tervalidasi; penyebabnya adalah seed semula hanya
membuat role dan kategori, bukan user yang dapat login.

## Tujuan

- Menjalankan frontend dan backend lokal dengan satu perintah `make neon-dev`.
- Menjaga semua kredensial database dan aplikasi hanya di backend `.env.neon`
  yang diabaikan Git.
- Menyediakan command terpisah dan terjaga untuk migration schema, seed,
  dan provision satu akun administrator pada Neon `dev`.
- Memastikan akun admin development dapat dibuat atau diperbarui secara
  idempoten untuk pengujian login lokal.

## Ruang lingkup dan batasan

Termasuk:

- Frontend tetap mengakses API lokal di `http://localhost:3000`.
- Backend berjalan dengan `NODE_ENV=neon` dan memakai URL Neon pooled untuk
  runtime aplikasi.
- Operasi schema/seed/provision memakai `DATABASE_URL_UNPOOLED`, yaitu URL
  direct Neon dengan TLS.
- Setiap operasi tulis memerlukan token konfirmasi yang berbeda.
- Provision admin meng-upsert satu user berdasarkan email, mengaktifkannya,
  menetapkan role `admin`, dan memperbarui password hash bcrypt.

Tidak termasuk:

- Menyalin, menghapus, atau reset seluruh data Neon.
- Migration otomatis ketika `make neon-dev` dijalankan.
- Provision akun production atau branch selain `dev`.
- Penyimpanan password, JWT secret, atau URL database nyata di repository.

## Kriteria penerimaan

1. `make neon-dev` menjalankan frontend lokal pada port 3001 dan backend lokal
   pada port 3000; browser tidak mengakses Neon secara langsung.
2. `make db-neon-dev-migrate`, `make db-neon-dev-seed`, dan
   `make db-neon-dev-provision-admin` hanya berjalan dengan konfirmasi eksplisit
   dan konfigurasi Neon `dev` yang valid.
3. Command database menolak URL pooled, TLS yang tidak valid, target tanpa
   riwayat migration Prisma yang kompatibel, atau branch attestation selain
   `NEON_BRANCH=dev`.
4. Provision admin tidak mencetak password atau connection string, serta dapat
   dijalankan ulang tanpa membuat user duplikat.
5. Login menggunakan kredensial yang diprovision dapat berhasil setelah
   `JWT_SECRET`, konfigurasi OSS, dan environment backend diisi dengan benar.

## Perubahan kode

### Frontend — `squat-fe`

- `Makefile`
  - Menambahkan `make neon-dev` untuk menjalankan FE/BE lokal dengan backend
    `NODE_ENV=neon`.
  - Menambahkan wrapper target database: `db-neon-dev-migrate`,
    `db-neon-dev-seed`, dan `db-neon-dev-provision-admin`.
  - Wrapper hanya meneruskan command ke workspace backend; URL Neon tidak
    pernah diteruskan ke Vite atau browser.
- `.env.example`
  - Menegaskan bahwa kredensial database/Neon tidak boleh berada pada variabel
    `VITE_*` atau env frontend.
- `README.md`
  - Menjelaskan workflow Neon lokal dan arah ke dokumentasi backend.

### Backend — `kataloka-main-be`

- `.env.neon.example` dan `.gitignore`
  - Menyediakan template konfigurasi Neon yang tidak berisi secret.
  - Mengabaikan `.env.neon` dari Git.
  - Mendokumentasikan `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`,
    konfigurasi OSS, JWT, dan kredensial provision admin.
- `src/config/database.ts`
  - Mendukung `DATABASE_URL`, memvalidasi format PostgreSQL, host, serta mode
    TLS untuk runtime Neon tanpa menonaktifkan verifikasi sertifikat.
- `prisma/seed.ts`
  - Memuat env sesuai `NODE_ENV` dan tidak lagi mematikan verifikasi sertifikat
    TLS saat membuka pool PostgreSQL.
- `scripts/local-to-neon-dev-preflight.mjs`
  - Memvalidasi source local dan target Neon `dev` tanpa melakukan koneksi,
    dump, migration, atau restore.
- `scripts/neon-dev-schema-seed.mjs`
  - Memvalidasi target direct Neon, TLS, confirmation token, dan riwayat
    migration Prisma sebelum operasi tulis.
  - Menjalankan `prisma migrate deploy` atau `prisma db seed` secara terpisah.
  - Menyediakan provision admin idempoten menggunakan query terparameterisasi,
    role `admin` aktif, dan bcrypt cost 12.
- `Makefile` dan `docs/neon-dev-schema-seed.md`
  - Mendokumentasikan command backend dan guardrail operasional.

## Cara penggunaan

1. Buat `kataloka-main-be/.env.neon` dari `.env.neon.example` dan isi semua
   nilai runtime yang wajib, terutama `DATABASE_URL`, `OSS_BASE_URL`,
   `OSS_USER_KEY`, dan `JWT_SECRET` yang unik serta tidak kosong.
2. Untuk operasi database, isi `DATABASE_URL_UNPOOLED` dari branch Neon `dev`
   dan set `NEON_BRANCH=dev`.
3. Jalankan aplikasi lokal:

   ```sh
   make neon-dev
   ```

4. Bila perlu, jalankan migration dan seed secara eksplisit:

   ```sh
   make db-neon-dev-migrate NEON_DEV_CONFIRM=apply-schema-to-neon-dev
   make db-neon-dev-seed NEON_DEV_CONFIRM=seed-data-to-neon-dev
   ```

5. Untuk akun admin development, isi `SEED_ADMIN_EMAIL` dan
   `SEED_ADMIN_PASSWORD` pada `.env.neon`, kemudian jalankan:

   ```sh
   make db-neon-dev-provision-admin NEON_DEV_CONFIRM=provision-admin-on-neon-dev
   ```

## Risiko dan catatan operasional

- Nama branch tidak dapat dibuktikan dari hostname Neon; `NEON_BRANCH=dev`
  adalah attestation operator. Pastikan URL memang disalin dari branch `dev`.
- Branch Neon yang kosong atau memiliki riwayat Prisma tidak kompatibel akan
  ditolak. Ini disengaja karena baseline migration yang ada membutuhkan prosedur
  inisialisasi sekali pakai yang ditinjau terpisah.
- Seed mengaktifkan role `admin`/`qa` dan menambah kategori enterprise.
- Provision admin dapat merotasi password user dengan email yang sama dan
  mengubahnya menjadi admin aktif; jalankan hanya untuk environment development.
- Kesalahan login `401` berarti user/password tidak cocok. Login dengan user
  valid tetapi tanpa `JWT_SECRET` akan gagal sebagai `500`.

## Ringkasan validasi

- Browser test pada `http://localhost:3001/login` berhasil mereproduksi request
  ke API lokal dan menerima `401`, bukan error CORS atau koneksi database.
- Konfigurasi runtime terverifikasi memakai `NODE_ENV=neon` dan host Neon.
- `git diff --check`, Node syntax check, TypeScript no-emit, Prisma validate,
  dry-run target Make, test frontend, dan review keamanan telah dijalankan pada
  perubahan yang relevan.
- Tidak ada migration, seed, provision admin, atau perubahan data Neon yang
  dijalankan otomatis oleh perubahan ini.
