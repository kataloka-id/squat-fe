# Dokumentasi Implementasi Login Kataloka

Tanggal dokumentasi: 19 Juli 2026  
Status: implementasi aplikasi dan integrasi database lokal selesai; histori migration production telah diverifikasi.

## 1. Brief produk

### Masalah

Pengguna belum dapat masuk ke aplikasi menggunakan kredensial akun. Akses ke area kerja perlu dibatasi hanya untuk sesi yang sah.

### Tujuan

Menyediakan alur login yang aman dan dapat digunakan dari frontend lokal maupun environment yang sesuai, termasuk pemulihan sesi setelah halaman dimuat ulang.

### User story

Sebagai pengguna terdaftar, saya ingin login menggunakan email dan kata sandi agar dapat mengakses workspace yang membutuhkan autentikasi.

### Scope

- Form login, validasi dasar, status loading, dan pesan kesalahan aman di frontend.
- Endpoint login, logout, dan pemeriksaan sesi di backend.
- Proteksi route workspace serta pemulihan sesi berbasis cookie.
- Validasi kredensial server-side, mitigasi enumerasi akun, dan rate limit login.
- Verifikasi schema pengguna, migration history, serta akun uji environment development/local.

### Di luar scope

- Registrasi akun, reset password, MFA/SSO, verifikasi email, dan deployment aplikasi.
- Perubahan secret atau infrastruktur production.

### Acceptance criteria

1. Kredensial valid menghasilkan sesi dan pengguna masuk ke workspace.
2. Kredensial salah atau payload tidak valid menghasilkan respons aman tanpa mengungkap keberadaan akun.
3. Submit ganda dicegah dan UI menunjukkan proses login.
4. Sesi tetap dapat dipulihkan setelah refresh halaman.
5. Pengguna tanpa sesi tidak dapat mengakses `/workspace`.
6. Kata sandi tidak disimpan di frontend atau dikembalikan oleh API.

## 2. Ringkasan implementasi

Autentikasi menggunakan JWT yang hanya dikirimkan melalui cookie `HttpOnly` bernama `kataloka_session`. Frontend tidak menyimpan token pada `localStorage` dan tidak mengirim header `Authorization: Bearer`.

Alur sederhananya:

```text
LoginPage -> POST /v1/auth/login -> Set-Cookie HttpOnly
Workspace -> GET /v1/auth/session -> validasi cookie/JWT
Logout    -> POST /v1/auth/logout -> clear cookie
```

Cookie memiliki `SameSite=Strict`, `Path=/`, dan atribut `Secure` saat `NODE_ENV=production`.

## 3. Kontrak API

Base URL berasal dari `VITE_API_URL`. Path di bawah ini memakai prefix backend `/v1`.

| Endpoint | Autentikasi | Request | Respons utama |
| --- | --- | --- | --- |
| `POST /v1/auth/login` | Tidak ada | `{ "email": string, "password": string }` | `200 AUTH_LOGIN_SUCCESS`, mengeset cookie, mengembalikan `data.user` |
| `GET /v1/auth/session` | Cookie `kataloka_session` | - | `200 AUTH_SESSION_SUCCESS` dengan `data.user` |
| `POST /v1/auth/logout` | Cookie `kataloka_session` | - | `200 AUTH_LOGOUT_SUCCESS`, menghapus cookie |

Kontrak error:

| Kondisi | Status | Kode |
| --- | --- | --- |
| Payload login tidak valid | `400` | `AUTH_INVALID_REQUEST` |
| Email tidak ditemukan, password salah, atau akun tidak aktif | `401` | `AUTH_INVALID_CREDENTIALS` |
| Sesi tidak ada/tidak valid/kedaluwarsa | `401` | `AUTH_UNAUTHENTICATED` |
| Terlalu banyak percobaan login | `429` | `AUTH_TOO_MANY_ATTEMPTS` |
| Kesalahan internal | `500` | `INTERNAL_SERVER_ERROR` |

## 4. Perubahan kode

### Frontend — `squat-fe`

- `src/components/login/LoginForm.tsx`
  - Validasi email/password, normalisasi email, pesan error inline, dan pencegahan submit ganda.
  - Mengarahkan pengguna ke `/workspace` setelah login berhasil.
- `src/api/axios.ts`
  - Menggunakan `withCredentials: true` untuk mengirim/menyimpan cookie sesi.
  - Menghapus penggunaan `localStorage` dan header Bearer token.
- `src/api/auth.service.ts` dan `src/types/api.ts`
  - Menyelaraskan kontrak cookie-session untuk login, logout, dan cek sesi.
- `src/App.tsx`
  - Menambahkan guard `/workspace` dengan pemeriksaan `GET /v1/auth/session` dan loading state.
- `src/components/projectsTestCases/Layout/Sidebar.tsx`
  - Logout tidak lagi mengakses token browser.
- `src/utils/retry.ts`
  - Tidak mengulang respons HTTP seperti `401` atau `429`, sehingga permintaan login tidak dikirim berulang.

### Backend — `kataloka-main-be`

- `src/modules/auth/auth.service.ts` dan `auth.repository.ts`
  - Login memakai bcrypt, dummy hash untuk email yang tidak ditemukan, pemeriksaan akun aktif, dan pembaruan `last_login_at`.
  - Menambahkan lookup pengguna untuk pemeriksaan sesi.
- `src/modules/auth/auth.controller.ts` dan `auth.cookie.ts`
  - Login mengeset cookie HttpOnly tanpa mengembalikan access token ke JavaScript.
  - Logout menghapus cookie dengan atribut yang sama.
  - Menambahkan controller pemeriksaan sesi.
- `src/modules/auth/auth.validation.ts`
  - Validasi dan normalisasi payload login di server.
- `src/middlewares/auth.middleware.ts`
  - Membaca token dari cookie, mem-pin JWT ke algoritma `HS256`, dan memvalidasi claim penting.
- `src/middlewares/error.middleware.ts`
  - Memetakan error autentikasi ke respons `4xx` yang aman dan membuat respons `5xx` generik dengan `request_id`.
- `src/middlewares/rate-limit.middleware.ts`
  - Menetapkan kontrak respons `429` untuk pembatasan percobaan login.
- `src/routes/v1/auth-login.route.ts` dan `auth-logout.route.ts`
  - Menambahkan route sesi dan mewajibkan sesi cookie untuk logout.

## 5. Database dan migration

### Kesiapan database

Tabel `tms.users` telah tersedia di environment development, local, dan production yang diverifikasi. Field yang digunakan login adalah:

- `id` (UUID)
- `email` (CITEXT dan unik)
- `password_hash`
- `role`
- `is_active`
- `last_login_at`

Ekstensi `citext` dan `uuid-ossp` tersedia pada target yang diperiksa. Tidak diperlukan DDL atau migration baru untuk fitur login saat ini.

### Keputusan histori migration

- `prisma/migrations/0000_baseline/migration.sql` dipulihkan byte-identik dengan checksum production `96afce760ce0abd1f952cab36614ea1b488d2a422b66ef3116449c1de2633d4e`.
- `prisma/migrations/22022026_baseline/migration.sql` **dipertahankan** karena tercatat sebagai migration yang sudah diterapkan di production, dengan checksum `92611e009a2ae729bfa52d574a79984811012bbfab41282dd3b2a479ec329870`.
- File `22022026_baseline` telah ditambahkan ke Git index agar histori source control tidak kehilangan migration production tersebut.
- Jangan mengubah atau memakai kedua baseline sebagai template replay untuk database baru tanpa strategi baseline/reconciliation yang khusus. Migration `22022026_baseline` adalah artefak histori yang telah diterapkan dan memuat diagnostic non-SQL di awal file.

## 6. Akun uji local/development

Akun uji telah dibuat pada database **local** yang dipakai API `http://localhost:3000`:

- Email: `login.test@kataloka.local`
- Password: `KtlkDev!6Qv#9sL2@Xr7-Pm4Za8w`
- Role: `qa`
- Status: aktif

Password tidak ditulis ke repository atau dokumentasi ini. Gunakan credential sementara yang dibagikan melalui kanal aman untuk pengujian lokal, lalu rotasi atau hapus akun saat tidak lagi diperlukan.

Catatan environment: backend yang dijalankan dengan konfigurasi default local memuat `.env.local`, bukan `.env.dev`. Akun awal dibuat pada database development sehingga tidak ditemukan oleh API local. Akun kemudian di-upsert pada database local dan tervalidasi.

## 7. Validasi yang telah dijalankan

- Frontend: `npm run build` berhasil.
- Backend: `npm run build` berhasil.
- Lint terarah pada file frontend/backend yang diubah berhasil.
- `prisma validate` berhasil.
- `NODE_ENV=production npx prisma migrate status` melaporkan dua migration dan database up to date.
- Verifikasi database production menunjukkan Prisma dan koneksi runtime mengarah ke target non-secret yang sama serta schema `tms.users` siap dipakai.
- API local:
  - `POST http://localhost:3000/v1/auth/login` dengan akun uji menghasilkan `200`.
  - Cookie `kataloka_session` HttpOnly terpasang.
  - `GET http://localhost:3000/v1/auth/session` menghasilkan `200`.
- Browser smoke:
  - Login di `http://localhost:3001/login` berhasil dan berpindah ke `/workspace`.

## 8. Risiko dan tindak lanjut

- Login limiter masih memakai store memori per proses. Untuk deployment multi-instance diperlukan shared rate-limit store yang disediakan DevOps.
- Tidak ada workflow CI/CD migration atau runbook backup/PITR yang terlacak di repository. Migration production sebaiknya dijalankan sebagai job terpisah dengan pemeriksaan backup, `prisma migrate status`, dan rollback plan.
- Lint penuh frontend masih memiliki pelanggaran baseline di area workspace yang tidak terkait perubahan login.
- JWT saat ini bersifat stateless. Logout menghapus cookie klien, tetapi token yang sebelumnya berhasil dicuri tetap berlaku sampai waktu kedaluwarsa. Jika kebutuhan keamanan meningkat, pertimbangkan token revocation atau token versioning.

## 9. Handoff

Fitur login siap digunakan pada environment local yang telah diverifikasi. Tidak ada deployment production dilakukan dalam pekerjaan ini. Sebelum rilis, pastikan histori migration yang sudah ditambahkan ke index ikut dalam commit yang ditinjau, serta selesaikan kebutuhan shared rate-limit store dan prosedur deployment/migration operasional.
