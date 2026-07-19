# Dokumentasi Perubahan Project dan Test Cases

## Product brief

Perubahan ini meningkatkan keandalan fitur **Project** dan **Test Cases** di dua repository Kataloka.

Tujuan utamanya adalah:

- memastikan akses Project dan Test Case mengikuti assignment Project untuk pengguna non-Admin;
- memvalidasi dan menjaga integritas data Project;
- menyediakan katalog Section yang dikelola Admin tetapi dapat dipilih oleh pengguna yang memiliki akses Project;
- menjaga penomoran Test Case per Project tetap monotonik dan mudah dibaca;
- memisahkan statistik Project dari state/filter tampilan Test Case; dan
- memperbaiki aksesibilitas serta layering kontrol UI pada halaman Test Cases.

Di luar cakupan perubahan ini: penggantian UUID primary key, server-side pagination, perubahan deployment, secret, atau database non-lokal.

## Ringkasan hasil

### Project

- Project Key dibatasi maksimal empat karakter, unik tanpa membedakan huruf besar/kecil, dan Project Name juga unik tanpa membedakan huruf besar/kecil.
- Status Project hanya `Active` atau `Completed`.
- External Link hanya menerima URL absolut `http` atau `https`.
- `created_by` selalu berasal dari sesi pengguna di backend; respons API mengembalikan username pembuat.
- Non-Admin hanya melihat dan mengakses Project yang di-assign. Admin memiliki cakupan seluruh Project.
- Pengguna non-Admin yang membuat Project otomatis di-assign ke Project tersebut dalam transaksi yang sama.
- Respons Project memuat `testCasesCount` kanonis yang dihitung dari data Test Case tersimpan.

### Test Cases dan Section

- Semua operasi Test Case tetap tersedia bagi role yang memiliki assignment pada Project terkait.
- Counter `tc_number` bersifat per Project, positif, unik, monotonik, dan tidak digunakan ulang setelah Test Case dihapus.
- Identifier tampilan Test Case memakai format `{PROJECT_KEY}-{SEQUENCE}`, misalnya `INIP-1`. UUID hanya digunakan sebagai identifier internal/API.
- Katalog Section global berada pada `tms.sections`. Semua pengguna yang berhak pada Project dapat memilih Section yang ada; CRUD katalog hanya tersedia untuk Admin melalui Settings.
- Operasi create/update Test Case mengunci Section dalam transaksi yang sama. Rename/delete Section juga menggunakan locking transaksi sehingga tidak menghasilkan referensi Section yatim.

### Antarmuka dan state

- Dropdown Project pada form Test Case hanya menampilkan Project assignment pengguna dan dapat dipilih bila lebih dari satu Project tersedia.
- Field Section adalah selector nilai katalog, bukan free-text untuk pengguna biasa.
- Count Project tidak lagi dihitung dari daftar Test Case yang sedang difilter. Create/delete Test Case menginvalidasi cache Project dan mengambil ulang count kanonis dengan guard terhadap respons stale.
- Bulk delete menangani keberhasilan parsial secara benar.
- Dropdown Rows per Page menggunakan portal ke `document.body`, sehingga tidak dipotong oleh overflow tabel. Posisi menyesuaikan ruang viewport, mendukung keyboard, click-outside, dan pembaruan pagination.

## Perubahan kode

### `kataloka-main-be`

| Area | Perubahan |
| --- | --- |
| Project controller dan route | Scope assignment untuk non-Admin, self-assignment saat create, agregasi `testCasesCount`, dan validasi akses pada detail/update/delete. |
| Project validation dan error middleware | Validasi key/status/link serta contract error konflik/validasi yang konsisten. |
| Test Case controller dan route | Counter transaksional, respons `tcNumber` dan `projectKey`, validasi Section, scope assignment, serta locking terhadap mutation katalog Section. |
| Section module dan route | Endpoint katalog `GET /v1/sections` dan CRUD Admin-only; rename mempropagasikan nilai legacy Test Case, delete ditolak bila masih digunakan. |
| Prisma schema dan migration | Menambahkan integritas Project/TC (`22022029_enforce_project_test_case_integrity`) dan katalog Section (`22022030_add_section_catalog`). |

Migration telah diterapkan **hanya pada database lokal**. Rollout ke environment lain tetap memerlukan persetujuan dan preflight data.

### `squat-fe`

| Area | Perubahan |
| --- | --- |
| API client dan types | Menambahkan contract `testCasesCount`, `tcNumber`, `projectKey`, Section catalog, dan invalidasi cache Project. |
| Halaman Project/Test Cases | Memisahkan Project stats dari state filter, refresh kanonis dengan request-version guard, serta menangani bulk delete parsial. |
| Form Test Case | Project selector scoped dan aksesibel; Section selector berbasis katalog; header edit memakai identifier bisnis. |
| Tabel Test Case dan Project Board | Menampilkan TC Number berformat dan memakai count kanonis dari Project API. |
| Settings | Menambahkan manajemen katalog Section khusus Admin. |
| Select UI | Menggunakan portal, positioning viewport-aware, dan ARIA listbox agar dropdown Rows per Page tidak terpotong. |
| Test tooling | Menambahkan Vitest dan regression tests untuk count Project, format TC Number, cache/stale response, serta Rows per Page. |

## Kontrak API penting

- `GET /v1/projects` mengembalikan Project sesuai scope caller dan menyertakan `testCasesCount`.
- Respons Test Case menyertakan `id`, `projectId`, `projectKey`, dan `tcNumber`.
- `GET /v1/projects/:projectId/sections` memerlukan assignment Project dan mengembalikan pilihan Section katalog.
- `GET /v1/sections` membaca katalog; `POST`, `PATCH`, dan `DELETE /v1/sections` hanya untuk Admin.
- Pengguna non-Admin yang meminta Project/Test Case di luar assignment menerima `403 PROJECT_ACCESS_DENIED`.

## Validasi

- Frontend: `npm test` (8 test lulus), `npm run build`, dan `git diff --check`.
- Backend: `npm run build`, `npm run prisma:validate`, targeted ESLint, `npm run test:cors` (9 test lulus), dan `git diff --check`.

Lint penuh masih memiliki temuan baseline di luar scope perubahan. Dependency audit setelah penambahan tooling test juga melaporkan kerentanan existing; tidak ada perbaikan dependency otomatis yang dilakukan dalam scope ini.
