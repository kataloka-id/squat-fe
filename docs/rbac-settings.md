# RBAC dan Settings

Dokumen ini menjelaskan perubahan frontend untuk RBAC dan manajemen akun. Kontrak API serta migration ada di `kataloka-main-be/docs/rbac.md`.

## Product brief

Sebelumnya aplikasi belum membatasi akses berdasarkan peran. Fitur ini menyediakan role awal `admin` dan `qa` di Settings: admin mengelola pengguna dan role, sedangkan non-admin hanya mengelola email, username, dan password akunnya sendiri.

### Scope

- Semua pengguna melihat **Profil saya** dan dapat memperbarui email, username, serta password baru.
- Admin dapat melihat, membuat, mengubah, mengaktifkan/nonaktifkan, dan menghapus akun.
- Admin dapat mengelola role yang disediakan API.
- Non-admin tidak merender atau meminta daftar user/role.

Di luar scope: permission granular, SSO/MFA, invite, reset password email, audit trail lengkap, dan multi-tenant.

### Acceptance criteria

1. Admin melihat manajemen akun/role; non-admin hanya melihat profil sendiri.
2. Pembatasan tetap ditegakkan backend, bukan hanya UI.
3. Pembukaan Settings mengirim maksimal satu request awal untuk setiap resource relevan, termasuk pada React Strict Mode.
4. Password tidak ditampilkan kembali oleh API.

## Perubahan kode

| Area | File | Ringkasan |
| --- | --- | --- |
| Settings | `src/components/settings/SettingsPage.tsx` | Profil sendiri, manajemen akun/role admin, loading/error/refresh, dan guard respons stale. |
| API | `src/api/users.service.ts` | Client `/v1/users/me`, `/v1/users`, `/v1/roles` serta deduplikasi request baca per sesi. |
| Sesi | `src/auth/SessionContext.tsx`, `src/App.tsx` | Menyediakan identitas sesi (`id`, email, username, role) untuk Settings. |
| Login/logout | `src/api/auth.service.ts` | Menginvalidasi request Settings saat sesi berubah. |
| Menu | `src/pages/ProjectsTestCasesPage.tsx` | Merender `SettingsPage` pada menu Settings. |
| Tipe | `src/types/api.ts` | Menambahkan tipe user, role, payload, dan envelope API. |
| Lokal | `Makefile`, `vite.config.ts` | URL localhost kanonis, port frontend 3001, dan lifecycle process tree. |

## Perilaku akses dan API

| Kemampuan | Admin | QA/non-admin |
| --- | --- | --- |
| Lihat/edit profil sendiri | Ya | Ya |
| Lihat daftar pengguna | Ya | Tidak |
| CRUD pengguna | Ya | Tidak |
| Lihat/kelola role | Ya | Tidak |

- `GET/PATCH /v1/users/me`: profil sendiri.
- `GET/POST/PATCH/DELETE /v1/users`: admin.
- `GET/POST/PATCH/DELETE /v1/roles`: admin.

Frontend memakai `roleSlug === "admin"` untuk UX. Backend adalah boundary keamanan untuk seluruh endpoint.

## Deduplikasi request dan sesi

React Strict Mode dapat me-remount efek development. Request baca Settings yang berbarengan untuk `/users/me`, `/users`, dan `/roles` dikoaleskan sehingga hanya satu request jaringan yang dibuat. Koalesi diikat ke *session generation*; login/logout menginvalidasi generation agar Promise akun lama tidak dapat dipakai pengguna berikutnya. `SettingsPage` juga memakai `loadGeneration` untuk menolak respons stale setelah unmount atau pergantian pengguna.

## Aksesibilitas dan autofill

- Email memakai `autocomplete="email"`.
- Username memakai `autocomplete="username"`.
- Pembuatan, perubahan, dan reset password memakai `autocomplete="new-password"`.

Form mempertahankan label eksplisit dan pesan status `role="alert"`.

## Menjalankan lokal

```sh
make local
```

Perintah ini foreground sampai `Ctrl+C`. URL resmi: frontend `http://localhost:3001`, backend `http://localhost:3000`. `make stop` menghentikan process tree yang direkam oleh `make local`. Jika record PID hilang, perintah ini hanya menghentikan PID listener Kataloka yang tervalidasi lewat port dan direktori kerja project; ia tidak menelusuri parent process. Listener asing tidak disentuh. Jangan membuka backend sebagai UI di `127.0.0.1:3000`; origin tersebut sengaja ditolak CORS.

## Validasi

```sh
npm run build
npx eslint src/api/auth.service.ts src/api/users.service.ts src/components/settings/SettingsPage.tsx
git diff --check
```

Lint penuh masih dapat memuat temuan legacy di luar scope RBAC. Tidak ada suite integration frontend khusus RBAC yang terkonfigurasi saat ini.

## Creds

    "email": "admin.local@example.test",
    "password": "admin123456",

    "email": "qa.local@example.test"
    "password": "qa123456"
