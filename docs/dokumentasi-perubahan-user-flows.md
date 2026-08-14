# Dokumentasi Perubahan User Flows

## Status dan tujuan

Dokumen ini mencatat perubahan lokal yang belum dikomit pada pemeriksaan 14 Agustus 2026 di dua repository: frontend `squat-fe` dan backend `kataloka-main-be`. Perubahan tersebut membangun fitur **User Flows** yang tersimpan per project: perjalanan pengguna dapat dibuat, dilengkapi langkah, dihubungkan ke Test Case, diberi dependency, dan dipantau dalam tampilan daftar maupun graf.

Perubahan ini bersifat lintas-repository dan mencakup kontrak API serta migration database. Migration hanya tersedia sebagai artefak persiapan; dokumen ini bukan persetujuan untuk menerapkannya ke database mana pun.

## Dampak pengguna

- Sidebar dan kartu Project menyediakan akses ke workspace **User Flows** serta menampilkan jumlah flow pada tiap project.
- Pengguna memilih project yang diizinkan, lalu dapat mencari dan menyaring flow menurut area, prioritas, kesehatan, serta status. Hasil mendukung pagination atau tampilan seluruh baris.
- Setiap flow memiliki nomor bisnis `UF-{nomor}`, judul, deskripsi, tujuan, titik masuk, kriteria sukses, area, prioritas, kesehatan, dan status.
- Detail flow mencakup langkah-langkah berurutan, Test Case tertaut beserta coverage otomatisasinya, dan dependency masuk/keluar. Pengguna dapat berpindah ke flow terkait tanpa kehilangan riwayat detail.
- Tampilan graf dependency bersifat baca-saja, menggunakan legenda jenis relasi, hover highlight, panduan aksesibel, dan node yang dapat dibuka. Fixture pengembangan dapat dibuka di mode development dengan parameter `?graph-arrowhead-preview`.
- Detail Test Case sekarang dirender melalui portal, dapat ditutup dengan tombol Escape, dan dapat digunakan sebagai tampilan baca-saja tanpa tombol edit atau lampiran.

## Perubahan frontend (`squat-fe`)

| Area | Perubahan |
| --- | --- |
| Navigasi dan state aplikasi | Menambahkan view `user-flows`, memilih project dari kartu Project atau dropdown, serta mempertahankan pilihan ketika berpindah workspace. Pilihan dibersihkan hanya bila respons daftar project yang berhasil tidak lagi mengizinkan project tersebut. |
| API client dan tipe | Menambahkan `UserFlowsService`, tipe flow/step/dependency/summary, invalidasi cache setelah mutasi flow, serta field kompatibel `userFlowsCount` pada respons project. |
| Workspace User Flows | Menambahkan pembuatan, pembaruan, penghapusan, filter, pagination, detail, manajemen langkah, tautan Test Case, dependency, metrik coverage, dan graf dependency. |
| Graf dependency | Menambahkan dependency `@xyflow/react`, layout graf deterministik, edge berjenis relasi, marker panah, hover highlight, dan CSS cursor/radius untuk node baca-saja. |
| Regression test | Menambahkan test service, pemilihan project, filter, pagination, detail/tautan Test Case, menu aksi, dan graf. Test halaman Project juga mencakup persistensi serta invalidasi pilihan User Flows. |

## Perubahan backend (`kataloka-main-be`)

| Area | Perubahan |
| --- | --- |
| Skema dan migration | Menambahkan tabel counter nomor flow per project, `user_flows`, langkah flow, tautan flow–Test Case, serta dependency antartflow. Migration kedua menambah `relationship_type` secara aditif. |
| Integritas data | Nomor `UF` unik per project dan meningkat lewat counter transaksional. Langkah memiliki urutan unik per flow. Tautan Test Case dan dependency membawa `project_id` untuk menjaga isolasi project. |
| Otorisasi | Semua route User Flows memakai autentikasi; controller memvalidasi UUID dan memeriksa akses caller pada project sebelum membaca atau memutasi data. |
| API dan validasi | Menambahkan CRUD flow, langkah, tautan Test Case, dependency, dan graf. Validasi membatasi enum priority/health/status/relationship serta panjang input, menolak ID ganda, self-dependency, dan Test Case lintas project. |
| Respons Project | `GET`, create, dan update Project kini memuat `userFlowsCount` selain `testCasesCount`, sehingga frontend tidak menghitung metrik dari state lokal. |
| Error dan test | Menambahkan kode error domain User Flow dan test controller/validation/migration, serta regression test count User Flow pada Project. |

## Kontrak API

Semua endpoint berikut berada di bawah `/v1/projects`, membutuhkan sesi terautentikasi, dan hanya dapat diakses pada project yang diizinkan.

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/:projectId/user-flows` | Mengembalikan koleksi flow dan ringkasan total, kesehatan, status aktif, serta coverage. |
| `POST` | `/:projectId/user-flows` | Membuat flow dan nomor `UF` berikutnya untuk project. |
| `GET`, `PATCH`, `DELETE` | `/:projectId/user-flows/:userFlowId` | Membaca, mengubah, atau menghapus flow. |
| `POST` | `/:projectId/user-flows/:userFlowId/steps` | Menambah langkah di urutan terakhir. |
| `PATCH`, `DELETE` | `/:projectId/user-flows/:userFlowId/steps/:stepId` | Mengubah atau menghapus langkah. |
| `PUT` | `/:projectId/user-flows/:userFlowId/steps/reorder` | Mengganti seluruh urutan langkah dengan `stepIds`. |
| `POST` | `/:projectId/user-flows/:userFlowId/test-cases` | Menautkan satu atau beberapa Test Case project yang sama. |
| `DELETE` | `/:projectId/user-flows/:userFlowId/test-cases/:testCaseId` | Melepas tautan Test Case. |
| `POST` | `/:projectId/user-flows/:userFlowId/dependencies` | Menambah dependency ke `targetFlowId`, opsional `relationshipType`. |
| `DELETE` | `/:projectId/user-flows/:userFlowId/dependencies/:dependsOnUserFlowId` | Menghapus dependency. |
| `GET` | `/:projectId/user-flows/graph` | Mengembalikan node flow dan edge dependency untuk graf. |

`GET /v1/projects` serta respons create/update Project bertambah secara kompatibel dengan field numerik `userFlowsCount`. Client lama dapat mengabaikan field ini.

## Data dan migration

Urutan artefak migration yang tersedia adalah:

1. `22022041_add_user_flows`: membuat tabel dan constraint inti User Flows.
2. `22022042_add_user_flow_dependency_relationship_type`: menambah kolom `relationship_type` dengan nilai default `requires` dan constraint enum.

Menghapus flow menghapus langkah dan dependency terkait. Menghapus tautan flow tidak menghapus Test Case. Foreign key pada tautan Test Case menggunakan `RESTRICT`, sehingga penghapusan Test Case yang masih tertaut harus ditangani sesuai aturan lifecycle data.

## Catatan review sebelum penggabungan

- Perubahan ini membutuhkan review integrasi frontend–backend, review database, dan review keamanan karena mengubah kontrak API serta menambah migration.
- `prisma/schema.prisma` juga menambahkan `goal`, `entry_point`, dan `success_criteria` pada model `roles`, tetapi kedua migration User Flows tidak menambah kolom tersebut pada tabel role. Perlu keputusan apakah field itu memang bagian dari role dan, bila ya, migration tersendiri.
- Test migration pertama mengharapkan foreign key `depends_on_user_flow_id` memakai `ON DELETE RESTRICT`, sedangkan SQL migration saat ini memakai `ON DELETE CASCADE`. Selaraskan test atau migration sebelum dianggap siap rollout.
- Error middleware mendefinisikan `USER_FLOW_TEST_CASE_NOT_FOUND`, tetapi controller unlink melempar `USER_FLOW_TEST_CASE_LINK_NOT_FOUND`. Kontrak error perlu diseragamkan agar responsnya terpetakan konsisten.
- Paket frontend baru `@xyflow/react` memerlukan review dependency sesuai kebijakan proyek.

## Bukti pemeriksaan

- Working tree frontend dan backend berisi perubahan yang belum di-stage/commit saat dokumentasi dibuat.
- `git diff --check` telah dijalankan pada kedua repository tanpa keluaran error whitespace.
- Test, build, lint, dan penerapan migration tidak dijalankan sebagai bagian dari pembuatan dokumentasi ini.
