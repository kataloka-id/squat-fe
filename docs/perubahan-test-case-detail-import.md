# Dokumentasi Perubahan Frontend: Detail dan Import Test Case

## Ringkasan

Perubahan frontend ini memperluas pengelolaan test case pada halaman proyek. Pengguna dapat mengisi informasi test case yang lebih lengkap, melihat detailnya tanpa langsung masuk ke mode edit, memfilter berdasarkan kesiapan automasi, serta mengimpor banyak test case dari berkas JSON.

Dokumen ini menjelaskan perubahan yang saat ini ada di worktree dan belum menjadi commit.

## Perilaku yang ditambahkan

### Form test case

Form tambah dan ubah test case sekarang mendukung:

- `Description` dalam Markdown.
- `Automation Readiness` dengan nilai `Not Automatable`, `Candidate`, `Ready`, atau `Automated`.
- `Main Expected Result` dalam Markdown.
- Editor Markdown dengan mode pratinjau untuk judul, deskripsi, prasyarat, langkah, hasil yang diharapkan, dan hasil utama.
- Pengurutan ulang langkah dengan drag-and-drop maupun kontrol keyboard, beserta pengumuman aksesibilitas.

Nilai `Candidate` dipakai sebagai fallback saat data test case lama belum memiliki `automationReadiness`.

### Daftar dan detail test case

- Kolom `Type` diubah menjadi `Testing Type`.
- Ditambahkan kolom dan filter `Automation Readiness`.
- Judul dan ID test case membuka panel detail baca-saja.
- Panel detail menampilkan metadata, deskripsi, prasyarat, seluruh langkah, dan hasil utama.
- Markdown pada tampilan ringkas dikonversi menjadi teks biasa; pada panel detail dirender sebagai elemen React yang aman. Tag HTML seperti `<script>` tidak dieksekusi.

### Import JSON

Dialog import dapat memilih proyek, mengunggah berkas JSON, memvalidasi isinya di browser, lalu mengirimkannya ke API setelah valid.

Batas dan aturan utama di sisi frontend:

- Maksimum ukuran berkas: 1 MiB.
- Maksimum test case per berkas: 100.
- Format yang didukung: `version: "1.0"` dan array `testCases`.
- `automationType` maupun nama lama `testingType` dapat diterima, tetapi keduanya harus sama bila dikirim bersama.
- Field tak dikenal dan identifier hasil generate (`id`, `key`, `tcNumber`) dilaporkan sebagai peringatan dan tidak dikirim sebagai identitas database.
- Pengguna dapat mengunduh template JSON yang sesuai dengan format import.

Setelah import sukses, daftar test case dan data proyek dimuat ulang agar jumlah serta isi data terbaru tampil di UI.

## Kontrak API yang digunakan

Frontend menambah pemanggilan:

```text
POST /v1/projects/{projectId}/test-cases/import
```

Respons error Axios kini mempertahankan `errors` dan `warnings` terstruktur dari API agar dialog import dapat menampilkan kesalahan validasi per field. Kontrak backend lengkap didokumentasikan di repository backend.

Payload create dan update test case juga kini dapat memuat `automationReadiness`, `description`, dan `mainExpectedResult`.

## Kompatibilitas

- Data lama yang tidak memiliki readiness tetap dapat dibuka dan ditampilkan sebagai `Candidate`.
- Field baru bersifat opsional pada batas tipe API agar frontend tetap kompatibel saat membaca record lama.
- Nilai Markdown disimpan sebagai teks mentah; sanitasi tampilan dilakukan saat dirender, bukan dengan mengubah konten pengguna saat disimpan.

## Area kode yang berubah

- Layanan API dan tipe kontrak: `src/api/axios.ts`, `src/api/projects.service.ts`, dan `src/types/api.ts`.
- Halaman orkestrasi state/modals/filter: `src/pages/ProjectsTestCasesPage.tsx`.
- Form, tabel, statistik, badge, tipe domain, panel detail, dan dialog import di `src/components/projectsTestCases/`.
- Utilitas Markdown di `src/utils/markdown.ts`.
- Pengujian unit untuk layanan, tipe, import, Markdown, dan tampilan detail/form.

## Ketergantungan dan catatan rilis

Fitur ini bergantung pada backend yang menyediakan endpoint import dan field test case baru. Saat dirilis, frontend dan backend perlu dipromosikan bersama agar UI tidak mengirim field atau endpoint yang belum tersedia.

Dokumen ini tidak menyatakan bahwa seluruh pengujian telah dijalankan; pengujian frontend tetap perlu dijalankan sebelum merge.
