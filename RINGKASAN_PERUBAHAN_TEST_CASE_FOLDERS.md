# Ringkasan Perubahan: Folder Test Case

Dokumen ini merangkum seluruh perubahan kerja yang belum di-*commit* pada dua repository. Fitur utamanya adalah pengelolaan folder bertingkat untuk test case dalam suatu project.

## Ringkasan Fitur

Pengguna dapat membuat struktur folder hingga lima tingkat, melihat test case berdasarkan folder atau status *unfiled*, memindahkan beberapa test case sekaligus, dan menghapus folder dengan strategi yang terkontrol. Setiap operasi tetap dibatasi pada project yang dapat diakses pengguna.

## Frontend — `squat-fe`

- Menambahkan pohon folder test case pada submenu **Test Cases** di sidebar.
- Menambahkan aksi membuat folder utama/subfolder, mengganti nama, dan menghapus folder.
- Menambahkan pilihan tampilan **All test cases**, **Unfiled**, serta folder tertentu; pengguna dapat menyertakan subfolder saat memfilter.
- Menyimpan folder aktif di parameter URL `folderId`, serta mereset pilihan dengan aman saat project berganti.
- Menampilkan jalur folder atau label **Unfiled** pada setiap item di daftar test case.
- Menambahkan aksi *bulk move* untuk memindahkan test case terpilih ke folder tujuan atau mengembalikannya menjadi *unfiled*.
- Menambahkan dialog penghapusan yang menampilkan dampak penghapusan, pilihan strategi pemindahan/penghapusan, dan konfirmasi eksplisit untuk penghapusan seluruh isi.
- Menambahkan tipe API dan service client untuk folder, dampak penghapusan, pemindahan massal, serta atribut `folderId` dan `folderPath` pada test case.
- Menambahkan/menyesuaikan pengujian komponen pohon folder, sidebar, select, pagination, dan pemilihan test case.

File implementasi utama frontend:

- `src/pages/ProjectsTestCasesPage.tsx`
- `src/components/projectsTestCases/TestCaseFolderTree.tsx`
- `src/components/projectsTestCases/Layout/Sidebar.tsx`
- `src/api/projects.service.ts`
- `src/types/api.ts`

## Backend — `kataloka-main-be`

- Menambahkan skema Prisma dan migration yang menyiapkan tabel `tms.test_case_folders` serta kolom nullable `folder_id` pada `tms.test_cases`.
- Menetapkan batas kedalaman folder 1–5, nama folder 1–100 karakter, indeks untuk pencarian, dan keunikan nama folder pada parent yang sama tanpa membedakan huruf besar/kecil.
- Menambahkan endpoint folder: daftar pohon folder beserta jumlah test case, buat, ubah nama, pratinjau dampak penghapusan, dan hapus folder.
- Menambahkan strategi penghapusan folder:
  - `MOVE_TO_PARENT`: test case langsung dipindahkan ke parent dan struktur anak dinaikkan satu tingkat.
  - `MOVE_TEST_CASES_TO_UNFILED`: test case langsung menjadi *unfiled* dan struktur anak dinaikkan satu tingkat.
  - `DELETE_ALL`: menghapus folder beserta seluruh subtree dan test case di dalamnya, dengan konfirmasi `DELETE` serta penolakan bila terdapat referensi precondition eksternal.
- Menambahkan endpoint `bulk-move` untuk memindahkan beberapa test case secara atomik ke folder tujuan atau ke *unfiled*.
- Memperluas pembuatan, pembaruan, import, dan daftar test case agar mendukung `folderId`, `folderPath`, serta filter folder/unfiled/subfolder.
- Menambahkan validasi `folderId`, penguncian folder/test case pada transaksi, pengecekan akses project, dan pemetaan error folder di middleware.
- Menambah dan memperbarui pengujian controller, termasuk validasi request dan rollback import.

File implementasi utama backend:

- `prisma/schema.prisma`
- `prisma/migrations/22022038_add_test_case_folders/migration.sql`
- `src/modules/test-cases/test-case-folders.controller.ts`
- `src/modules/test-cases/test-cases.controller.ts`
- `src/routes/v1/test-cases.route.ts`
- `src/middlewares/error.middleware.ts`

## Kontrak API Baru/Diubah

- `GET /v1/projects/:projectId/test-case-folders`
- `POST /v1/projects/:projectId/test-case-folders`
- `PATCH /v1/projects/:projectId/test-case-folders/:folderId`
- `GET /v1/projects/:projectId/test-case-folders/:folderId/delete-impact`
- `DELETE /v1/projects/:projectId/test-case-folders/:folderId`
- `POST /v1/projects/:projectId/test-cases/bulk-move`
- `GET /v1/projects/:projectId/test-cases` kini menerima scope folder, *unfiled*, dan opsi penyertaan subfolder.
- Payload create/update test case kini dapat berisi `folderId`; respons test case dapat berisi `folderId` dan `folderPath`.

## Catatan Database

Migration sudah disiapkan, tetapi belum diterapkan. Kolom `folder_id` bersifat nullable sehingga test case yang sudah ada tetap berada pada keadaan *unfiled* dan kompatibel selama rollout database belum dijalankan.

## Status Validasi

Dokumen ini adalah ringkasan perubahan berdasarkan working tree. Tidak ada test, migration, atau deployment yang dijalankan sebagai bagian dari pembuatan dokumentasi ini.
