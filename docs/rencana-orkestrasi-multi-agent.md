# Rencana orkestrasi multi-agent Kataloka

## Tujuan

Menjadikan Codex yang dijalankan dari workspace frontend sebagai **orchestrator**
untuk menerima permintaan fitur atau perbaikan bug dari Product, membagi pekerjaan
ke agen spesialis, mengoordinasikan perubahan di frontend dan backend, serta
menjalankan review dan siklus perbaikan hingga selesai.

Workspace yang dicakup:

| Area | Workspace |
| --- | --- |
| Frontend | `/Users/dayadi-qa/GIT/KATALOKA-ID/squat-fe` |
| Backend dan database | `/Users/dayadi-qa/GIT/KATALOKA-ID/kataloka-main-be` |
| DevOps | Ditentukan saat implementasi (belum ada workspace infrastruktur terpisah yang disebutkan) |

## Prinsip penting

- `AGENTS.md` berfungsi sebagai instruksi kerja; file ini sendiri tidak dapat
  menjalankan agent secara otomatis.
- Otomatisasi yang dimaksud adalah: saat pengguna memberi satu instruksi
  end-to-end dari `squat-fe`, Codex bertindak sebagai orchestrator, menugaskan
  pekerjaan lintas workspace yang relevan, dan mengizinkan perubahan pada kedua
  repository sesuai scope tugas.
- Orchestrator tetap meminta persetujuan atau melaporkan blocker jika perubahan
  membutuhkan akses, kredensial, deployment produksi, atau keputusan produk yang
  belum diberikan.
- Setiap agen hanya mengubah area yang menjadi kepemilikannya. Perubahan lintas
  area dilakukan melalui task dari orchestrator, bukan dengan mengambil alih
  pekerjaan agen lain.
- Pemilihan model tidak didefinisikan di `AGENTS.md`. Konfigurasi model berada
  pada konfigurasi Codex tingkat proyek/sesi, lalu digunakan oleh orchestrator
  dan sub-agent sesuai kemampuan Codex yang tersedia di workspace pengguna.

## Struktur peran yang akan ditambahkan

```text
Product request / bug report
            |
            v
 Product Owner / Manager agent
 (klarifikasi acceptance criteria & prioritas)
            |
            v
 Orchestrator agent
 (pecah task, tetapkan owner, pantau dependensi)
     |       |       |       |       |
     v       v       v       v       v
    FE      BE      DB    DevOps  Security
     \       |       |       |      /
      \------ integration & handoff ---/
                     |
                     v
               Review agent
                     |
         temuan? ---+--- tidak --> handoff selesai
             |
             v
  Orchestrator menugaskan perbaikan ke owner
             |
             +------------> review ulang
```

### 1. Product Owner / Manager agent

Menerima kebutuhan produk dan mengubahnya menjadi brief terstruktur:

- masalah, tujuan, prioritas, dan ruang lingkup;
- user story dan acceptance criteria yang dapat diuji;
- kebutuhan nonfungsional, risiko, dan dampak API/data;
- pertanyaan klarifikasi yang benar-benar menghalangi implementasi.

Agent ini tidak melakukan perubahan kode.

### 2. Orchestrator agent

Menjadi satu pintu kerja ketika Codex dijalankan dari `squat-fe`:

- membaca brief Product Owner/Manager;
- menentukan agent yang diperlukan: frontend, backend, database, DevOps, dan/atau security;
- membuat task yang independen, menetapkan workspace dan dependensi tiap task;
- meneruskan kontrak API dan keputusan lintas tim;
- memanggil review setelah implementasi dan mendistribusikan temuan ke owner;
- mengulangi implementasi dan review sampai tidak ada temuan blocking;
- membuat handoff akhir berisi perubahan, validasi, risiko, dan pekerjaan lanjutan.

Orchestrator boleh mengarahkan perubahan di kedua repository, tetapi tidak boleh
langsung mengubah kode sebagai pengganti agent pemilik kecuali pengguna meminta
pengecualian tersebut.

### 3. Frontend agent

Memiliki `/Users/dayadi-qa/GIT/KATALOKA-ID/squat-fe`: UI, state client,
integrasi API, aksesibilitas, dan pengujian frontend.

### 4. Backend agent

Memiliki `/Users/dayadi-qa/GIT/KATALOKA-ID/kataloka-main-be`: endpoint, logika
bisnis, otorisasi, validasi server, dan pengujian backend.

### 5. Database agent

Memiliki artefak database di backend: skema, migrasi, indeks, integritas data,
strategi rollback, dan verifikasi keamanan migrasi. Database agent berkoordinasi
dengan backend agent sebelum kontrak data diselesaikan.

### 6. DevOps agent

Menilai dan, bila lokasi konfigurasinya tersedia dalam scope, mengubah CI/CD,
environment/configuration, deployment, observability, dan rollback. Ia tidak
menjalankan deployment produksi tanpa instruksi/persetujuan eksplisit.

### 7. Security agent

Melakukan threat check dan review yang berfokus pada autentikasi/otorisasi,
validasi input, kebocoran data, secret, dependency risk, dan dampak perubahan
infrastruktur. Ia membuat temuan dan rekomendasi; perbaikannya dikerjakan oleh
owner area terkait.

### 8. Review agent

Meninjau perubahan lintas area: correctness, regresi, kompatibilitas kontrak
API, test coverage, migrasi, security, dan kesiapan operasional. Temuan wajib
memuat severity, workspace, file/baris bila tersedia, dampak, dan arahan perbaikan.

## Strategi model AI Codex

### Tujuan

Menggunakan kapasitas reasoning secara proporsional: tugas yang sifatnya
administratif memakai konfigurasi hemat, sedangkan perubahan kode kritis dan
review memakai konfigurasi coding/reasoning yang lebih kuat.

### Kebijakan pemilihan model

Nama model spesifik **tidak akan di-hardcode** sebelum dikonfirmasi tersedia pada
akun/workspace Codex. Konfigurasi akan menggunakan model Codex yang tersedia dan
direkomendasikan saat implementasi. Jika platform hanya mendukung satu model untuk
satu sesi, seluruh sub-agent mewarisi model tersebut dan pembedaan dilakukan lewat
level reasoning serta instruksi peran.

Keputusan yang diterapkan: gunakan `gpt-5.6-terra` sebagai batas maksimum model
dan `ultra` untuk reasoning orchestrator. Pengaturan ini berada di
`squat-fe/.codex/config.toml` agar mudah diubah tanpa mengedit instruksi agent.

| Peran | Kelas kemampuan yang ditargetkan | Reasoning | Alasan |
| --- | --- | --- | --- |
| Product Owner / Manager | Cepat/efisien | Rendah–sedang | Merapikan kebutuhan, acceptance criteria, dan prioritas tanpa mengubah kode. |
| Orchestrator | Coding/reasoning terkuat yang tersedia | Tinggi | Menentukan dependensi lintas repo, mengoordinasikan agent, dan mengambil keputusan teknis. |
| Frontend | Coding yang kuat | Sedang–tinggi | Implementasi UI, integrasi, dan debugging frontend. |
| Backend | Coding/reasoning yang kuat | Tinggi | Logika bisnis, kontrak API, validasi, dan dampak integrasi. |
| Database | Coding/reasoning yang kuat | Tinggi | Menilai integritas data, migration, indeks, rollback, dan risiko data loss. |
| DevOps | Coding/reasoning yang kuat | Tinggi | Menilai CI/CD, konfigurasi environment, observability, dan rollback. |
| Security | Reasoning terkuat yang tersedia | Tinggi | Threat modeling serta analisis autentikasi, otorisasi, secret, dan risiko eksploitasi. |
| Review | Coding/reasoning terkuat yang tersedia | Tinggi | Menangkap regresi dan masalah lintas area secara independen. |

### Konfigurasi yang akan dibuat

1. Menambahkan `squat-fe/.codex/config.toml` sebagai konfigurasi proyek untuk
   default model/reasoning orchestrator, sandbox, dan aturan delegasi yang
   didukung oleh instalasi Codex.
2. Meninjau apakah `kataloka-main-be/.codex/config.toml` diperlukan untuk
   menetapkan default yang sama ketika backend agent bekerja langsung dari
   workspace backend. Jika diperlukan, konfigurasi backend hanya memuat default
   lokal dan tidak menggantikan orchestrator pusat di frontend.
3. Menambahkan matriks peran di `AGENTS.md` yang menyatakan kelas kemampuan dan
   reasoning yang diharapkan, tanpa menyatakan model ID yang tidak terverifikasi.
4. Saat fitur konfigurasi Codex mendukung pemilihan model per delegasi, memetakan
   peran ke model yang tersedia sesuai tabel di atas. Jika tidak didukung,
   orchestrator menjalankan tugas dengan model sesi yang sama dan menyetel
   kedalaman reasoning melalui instruksi tugas.

### Fallback dan keselamatan

- Jika model coding/reasoning terkuat tidak tersedia, gunakan model Codex terbaik
  yang tersedia dan tandai risiko tambahan pada handoff.
- Tugas security, migration database, dan review blocking tidak diturunkan ke
  konfigurasi hemat hanya untuk menghemat biaya/waktu.
- Orchestrator tidak menganggap perubahan selesai bila validasi atau review
  membutuhkan kemampuan yang tidak tersedia; ia melaporkan blocker tersebut.
- Model, reasoning effort, dan fitur konfigurasi yang dipakai dicatat pada
  handoff akhir agar hasil dapat diaudit.

## Alur kerja yang akan diterapkan

1. Pengguna memberi request fitur/bug dari `squat-fe` dalam satu instruksi.
2. Product Owner/Manager agent membuat brief dan acceptance criteria.
3. Orchestrator membuat daftar task per agent, termasuk urutan dependensi dan
   kontrak FE–BE.
4. Agent spesialis mengerjakan task di workspace masing-masing dan melakukan
   validasi relevan.
5. Orchestrator mengumpulkan handoff, lalu meminta security check dan code review.
6. Jika ada temuan actionable, orchestrator mengembalikan temuan tersebut kepada
   agent pemilik (atau kepada beberapa owner untuk temuan lintas area).
7. Agent pemilik memperbaiki, menjalankan ulang pemeriksaan relevan, dan mengirim
   resolution handoff.
8. Review agent memverifikasi resolusi. Langkah 6–8 diulang sampai semua temuan
   blocking tertutup atau pengguna secara eksplisit menerima pengecualian.
9. Orchestrator menyampaikan ringkasan akhir.

## Perubahan konfigurasi yang direncanakan setelah persetujuan

1. Memperbarui `squat-fe/AGENTS.md` menjadi konfigurasi pusat yang memuat peran
   Product Owner/Manager dan Orchestrator, serta mandat perubahan lintas repo
   melalui delegasi agent pemilik.
2. Memperbarui `kataloka-main-be/AGENTS.md` agar peran backend, database, dan
   security selaras dengan orchestrator pusat serta tidak menghapus aturan
   keselamatan perubahan database yang ada.
3. Menambahkan format task/handoff/review yang konsisten di kedua file agar
   orchestrator dapat meneruskan brief tanpa kehilangan acceptance criteria,
   kontrak, hasil validasi, atau temuan.
4. Menambahkan `squat-fe/.codex/config.toml` untuk default Codex tingkat proyek
   dan memverifikasi opsi model/reasoning yang benar-benar tersedia sebelum
   memasukkan model ID.
5. Menambahkan instruksi eksplisit bahwa request end-to-end yang diberikan dari
   `squat-fe` dapat memicu delegasi dan perubahan pada `kataloka-main-be`.
6. Memverifikasi konsistensi kedua `AGENTS.md`, konfigurasi Codex, dan memastikan perubahan yang
   sudah ada di backend tidak disentuh.

## Status implementasi

- Selesai: konfigurasi pusat Orchestrator dan seluruh peran ditambahkan pada
  `squat-fe/AGENTS.md`.
- Selesai: instruksi backend/database diselaraskan pada
  `kataloka-main-be/AGENTS.md`.
- Selesai: `squat-fe/.codex/config.toml` menetapkan `gpt-5.6-terra` dengan
  reasoning `ultra`.
- Selesai: `scripts/kataloka-orchestrator` membuka sesi Codex dari frontend
  dengan backend sebagai workspace tambahan yang dapat ditulis.
- Selesai: loop handoff, review, dan penugasan perbaikan dicantumkan pada
  instruksi orkestrator.

## Cara menjalankan orkestrator

Jalankan dari `squat-fe`:

```bash
./scripts/kataloka-orchestrator
```

Launcher tersebut memberi sesi Codex akses ke `squat-fe` dan
`kataloka-main-be`. Setelah itu, berikan request end-to-end kepada Orchestrator.

## Contoh perintah setelah implementasi

```text
Sebagai orchestrator, proses request produk berikut secara end-to-end:
"Pengguna harus dapat mengubah nomor telepon pada profil."

Mulai dengan Product Owner/Manager untuk acceptance criteria. Buat dan jalankan
task yang diperlukan untuk frontend, backend, database, DevOps, dan security.
Lakukan perubahan di squat-fe dan kataloka-main-be bila relevan. Jalankan review,
perbaiki seluruh temuan actionable, dan ulangi review sampai tidak ada temuan
blocking. Berikan handoff akhir.
```

## Keputusan yang perlu dikonfirmasi sebelum implementasi

1. Lokasi source of truth DevOps (apakah di salah satu repo di atas atau repo lain). > saat ini belum ada dan belum ditentukan tujuannya untuk keperluan automated deployment kedepannya
2. Apakah database agent boleh membuat migration secara langsung, atau hanya
   menyiapkan migration untuk persetujuan. > hanya menyiapkan migration untuk persetujuan
3. Apakah security review wajib untuk semua perubahan, atau hanya untuk perubahan
   yang menyentuh autentikasi, data, dependency, dan infrastruktur. > hanya untuk perubahan yang menyentuh autentikasi, data, dependency, dan infrastruktur
4. Model Codex apa saja yang tersedia/diizinkan di workspace Anda, atau apakah
   konfigurasi harus menggunakan satu model default untuk semua sub-agent. > maksimal menggunakan model Codex gpt-5.6-terra (tidak boleh lebih tinggi dari ini). dan harus mudah dikonfigurasi.
