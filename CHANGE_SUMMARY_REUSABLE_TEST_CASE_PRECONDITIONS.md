# Ringkasan Perubahan: Reusable Test Case sebagai Preconditions

Dokumen ini merangkum seluruh perubahan kerja yang saat ini belum di-commit pada dua repository: `squat-fe` dan `kataloka-main-be`.

## Tujuan perubahan

Menambahkan kemampuan untuk menandai sebuah test case sebagai *reusable*, lalu menghubungkannya sebagai precondition dari test case lain di proyek yang sama. Pengguna dapat memilih, menyusun ulang, dan menghapus tautan precondition tanpa menghapus precondition Markdown yang sudah ada.

## Frontend (`squat-fe`)

### Form dan detail test case

- Form create/edit memiliki toggle **Reusable Test Case**.
- Form dapat membuka pemilih reusable test case yang terikat pada proyek aktif, melakukan pencarian, memilih beberapa item, lalu menyimpan hanya `testCaseId` dan `sortOrder`.
- Tautan precondition dapat diurutkan ulang, dihapus, dan menampilkan peringatan bila sumbernya deprecated.
- Preconditions Markdown tetap dipertahankan dan dapat tampil bersamaan dengan reusable preconditions.
- Panel detail menampilkan daftar **Linked Reusable Test Cases** sesuai urutan tersimpan, metadata sumber, status tidak tersedia untuk relasi lama, serta tautan untuk membuka sumber di tab baru.
- Tautan sumber menggunakan parameter `projectId` dan `testCaseId`; halaman workspace mengenali parameter tersebut, memuat proyek yang dituju, dan membuka detail test case bila data tersedia.
- Setelah create berhasil, tersedia aksi **Create & Add Another**. Aksi ini mereset form, mempertahankan proyek aktif, memuat ulang section, dan memfokuskan field judul. Nilai form tetap dipertahankan bila penyimpanan gagal.

### Tabel dan pengalaman pengguna

- Kolom **Testing Type** dan **Automation Readiness** kini dapat diedit langsung oleh pengguna yang memiliki izin pengelolaan, termasuk indikator loading per sel dan pemulihan nilai sebelumnya jika API gagal.
- Dropdown inline ditingkatkan aksesibilitasnya melalui tombol, `listbox`, dan `option`, serta memperbaiki posisi menu dan teks pilihan panjang.
- Badge metadata pada panel detail sekarang berlabel jelas, termasuk badge Section.
- Logika filter, sort, dan pagination dipindahkan ke utilitas bersama. Nomor test case diurutkan secara numerik dan tanggal pembaruan diurutkan berdasarkan tanggal kalender lokal dengan urutan stabil untuk nilai yang sama.

### Kontrak frontend

- Payload create/update menambahkan `isReusable: boolean` dan `linkedPreconditions?: Array<{ testCaseId: string; sortOrder: number }>`.
- Client menambahkan `GET /v1/projects/:projectId/test-cases/reusable` dengan parameter opsional `search`, `sectionId`, `status`, dan `excludeTestCaseId`.
- Tipe respons test case sekarang mencakup `isReusable` dan `linkedPreconditions` beserta metadata sumber untuk tampilan.

### Pengujian frontend yang ditambahkan/diperbarui

- Pemilihan, penyimpanan, pengurutan, dan penghapusan reusable preconditions.
- Tampilan detail untuk kondisi kosong, Markdown saja, linked saja, kombinasi keduanya, urutan tersimpan, deprecated, dan sumber yang tidak lagi tersedia.
- Alur create-and-add-another, termasuk kegagalan dan kondisi request berjalan.
- Edit inline Testing Type/Automation Readiness dan penanganan gagal simpan.
- Sorting dan pipeline filter-sort-pagination.

## Backend (`kataloka-main-be`)

### Data model dan migration

- Model `tms_test_cases` menambahkan `is_reusable BOOLEAN NOT NULL DEFAULT FALSE`.
- Menambahkan tabel `tms.test_case_precondition_links` untuk relasi parent test case ke reusable source test case, termasuk `sort_order`, pelacakan pembuat, foreign key, unique constraint, check constraint, dan indeks untuk parent/order serta source.
- Migration `22022037_add_reusable_test_case_preconditions` bersifat aditif dan diberi catatan **belum boleh diterapkan tanpa persetujuan rollout database**.

### API dan aturan bisnis

- Respons test case create, update, get, dan list memuat `isReusable` serta `linkedPreconditions` yang sudah diurutkan dan berisi metadata sumber.
- Endpoint baru `GET /v1/projects/:projectId/test-cases/reusable` mengembalikan test case reusable, bukan deprecated, dari proyek yang sama. Endpoint mendukung pencarian, filter section/status, pengecualian ID tertentu, pagination, dan tetap memeriksa akses proyek.
- Create dan update menerima `isReusable` serta `linkedPreconditions`.
- Relasi precondition divalidasi di dalam transaksi: tidak boleh duplikat, self-reference, lintas proyek, sumber yang tidak reusable/deprecated, urutan tidak kontigu mulai dari 1, atau membentuk siklus.
- Perubahan graph relasi diserialkan per proyek memakai transaction advisory lock untuk mencegah race condition ketika validasi siklus berlangsung.
- Error domain baru ditambahkan untuk seluruh kegagalan validasi precondition di atas.

## Dampak kontrak dan catatan integrasi

- Perubahan ini adalah kontrak API/data lintas-repo dan memerlukan frontend serta backend dari versi perubahan yang sama.
- Klien lama tetap kompatibel terhadap kolom database baru karena `is_reusable` memiliki nilai default `false`; namun fitur reusable precondition membutuhkan migration dan endpoint backend baru sebelum dapat digunakan.
- Migration hanya disiapkan, bukan dijalankan. Rencana rollout, backup, dan rollback database tetap memerlukan persetujuan terpisah.

## File utama yang berubah

| Repository | Area |
| --- | --- |
| `squat-fe` | service API, tipe API/UI, form/detail/list test case, halaman workspace, utilitas sorting, serta test terkait |
| `kataloka-main-be` | Prisma schema, migration, controller/validasi/route test case, error middleware, serta test controller dan validasi |

