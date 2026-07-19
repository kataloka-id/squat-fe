# Implementasi RBAC Project dan Team

## Product brief

Non-admin hanya dapat mengakses project yang ditugaskan kepadanya. Admin mempertahankan akses CRUD penuh pada Projects, Test Cases, dan pengaturan assignment. Menu Team menjelaskan anggota berdasarkan project; non-admin hanya dapat melihat data Team dalam scope projectnya.

## Tujuan dan scope

- Assignment many-to-many user non-admin ke project melalui Settings.
- Enforcement scope project di backend untuk Projects, Test Cases, dan Team.
- Team view-only bagi non-admin dan pengelolaan assignment oleh admin.
- Fondasi scope yang dapat dipakai Test Runs dan Reports berikutnya.
- Deduplikasi request GET agar React Strict Mode atau mount ulang tidak menggandakan request identik.

Di luar scope: deployment produksi, penerapan database non-lokal, permission granular selain admin/non-admin, dan implementasi Test Runs/Reports.

## Ringkasan perubahan frontend

| Area | Perubahan |
| --- | --- |
| Settings | Admin dapat melihat serta mengganti assignment project user non-admin melalui `GET/PUT /v1/users/:userId/project-assignments`. |
| Team | Halaman Team dikelompokkan per project scoped; non-admin tidak menerima kontrol mutasi. |
| Projects | Data project berasal dari API scoped. CRUD hanya tersedia untuk admin. |
| Test Cases | List dan CRUD memakai API project-scoped; field UI lengkap dipetakan ke kontrak backend. |
| Akses UI | Kontrol create, update, delete, bulk action, dan assignment tidak dirender untuk non-admin. |
| Read client | `src/api/read-cache.ts` menjadi standar GET: in-flight coalescing, TTL 30 detik, cache LRU terbatas, force refresh, invalidasi mutation/sesi, serta guard respons stale. |
| CORS | Backend mengizinkan preflight `PUT` dari frontend lokal resmi untuk assignment. |

## Kontrak integrasi utama

- `GET /v1/projects`: daftar project sesuai scope sesi.
- `GET /v1/projects/:id/members`: anggota Team pada project yang diizinkan.
- `GET|PUT /v1/users/:userId/project-assignments`: admin; payload PUT `{ "projectIds": ["uuid"] }`.
- `GET|POST /v1/projects/:projectId/test-cases` dan `PATCH|DELETE /v1/projects/:projectId/test-cases/:id`: read scoped, mutation admin.

Untuk endpoint GET baru, gunakan `getCached(key, request)` dari `src/api/read-cache.ts`, bukan Axios langsung. Mutasi harus menginvalidasi key resource terkait.

## Acceptance criteria yang terpenuhi

- Assignment duplikat dicegah oleh constraint database dan validasi API.
- Non-admin hanya dapat membaca project, Team, dan Test Case yang ditugaskan; mutation dibatasi admin di backend.
- Admin dapat mengelola assignment, project, dan test case.
- Team non-admin bersifat view-only.
- Request identik pada Strict Mode hanya menghasilkan satu network request per key selama cache masih valid; refresh eksplisit dan mutation tetap mengambil data baru.

## Validasi lokal

- Frontend: `npm run build`, lint file API terkait, dan `git diff --check` lulus.
- Browser smoke dengan React Strict Mode: `GET /v1/projects` dan `GET /v1/projects/:id/members` masing-masing satu kali.
- Backend/local database: migration Prisma status up to date dan smoke RBAC lokal lulus.
- Preflight CORS `PUT` dari `http://localhost:3001` menghasilkan `204`; origin tidak diizinkan tetap `403`.

## Database dan operasional

Migration additive berada di repository backend: `prisma/migrations/22022028_add_project_assignments`. Migration tersebut telah disetujui dan diuji di database lokal, tetapi tidak mencakup deployment produksi. Rollout selain lokal harus mengikuti runbook backend, termasuk backup dan assignment eksplisit untuk user non-admin yang sudah ada.

