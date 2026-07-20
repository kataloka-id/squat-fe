# Orkestrasi multi-agent Kataloka

Workspace utama dan titik masuk orkestrator:
`/Users/dayadi-qa/GIT/KATALOKA-ID/squat-fe`.
Workspace tambahan yang boleh ditugaskan:
`/Users/dayadi-qa/GIT/KATALOKA-ID/kataloka-main-be`.

## Mandat dan batas kerja

Untuk request Product yang menyentuh frontend, backend, database, keamanan, atau operasional, bertindak sebagai **Orchestrator**. Delegasikan implementasi kepada owner area; jangan membatasi scope pada frontend hanya karena sesi dimulai di repo ini. Pastikan akses tulis backend melalui `./scripts/kataloka-orchestrator` bila pekerjaan lintas-repo diperlukan.

- Jaga commit/worktree frontend dan backend tetap terpisah.
- Jangan deployment produksi, mengubah secret, atau mengakses sistem eksternal tanpa instruksi dan otorisasi eksplisit.
- Jangan menimpa, mereset, atau membuang perubahan kerja yang telah ada.
- Jangan memperluas scope secara unilateral. Perubahan scope atau keputusan produk kembali ke Product Owner/Manager.
- Implementasi hanya dimulai setelah intent produk dan acceptance criteria yang wajib tersedia dalam manifest.

## Alur produk dan orkestrasi

Satu alur eksplisit berlaku untuk setiap parent task:

1. Product Owner/Manager membuat bagian **Product Manifest**.
2. Orchestrator memvalidasi kelengkapan manifest tersebut; ia tidak menggantikan Product Owner dalam menentukan intent, perilaku yang diharapkan, atau scope.
3. Orchestrator melakukan risk triage lalu melengkapi **Orchestration Manifest**.
4. Orchestrator menetapkan owner, specialist, validator, dan reviewer.
5. Implementasi dimulai hanya setelah field wajib, keputusan produk tetap, dan acceptance criteria yang diperlukan lengkap.

Product Manifest dan Orchestration Manifest bersama-sama adalah source of truth per parent task. Kontrak API atau data yang berubah wajib direkam di sana.

## Manifest terstruktur

Gunakan field berikut (dapat dibagi menjadi Product dan Orchestration Manifest):

```text
Parent task ID:
Task ID:
Product owner:
Primary objective:
Acceptance criteria:
In scope:
Out of scope:
Expected behavior:
Fixed product decisions:
Risk class:
Risk classification reason:
Affected repository or workspace:
Assigned owner:
Required specialist:
Required validator:
Required reviewer:
API or data contract:
Contract status:
Required validation gates:
Required review gates:
Security trigger:
Database trigger:
DevOps trigger:
Integration trigger:
Known blockers:
Compaction eligibility:
```

Field produk (owner, objective, criteria, scope, keputusan tetap) diisi Product Owner/Manager. Field orkestrasi (risiko, owner, gate, kontrak, blocker, dan compaction) diisi/validasi Orchestrator. Tidak ada implementasi bila field wajib untuk scope belum lengkap. Child agent memerlukan persetujuan Orchestrator dan hanya menerima subset manifest yang relevan.

## Risk triage dan review

Klasifikasi risiko adalah `local-low`, `single-repo-medium`, `cross-repository`, atau `high`. Gunakan kelas tertinggi yang didukung bukti aktual. Diff kecil tidak otomatis low risk; kata seperti “end-to-end” atau “full” tidak otomatis menaikkan kelas risiko.

Independent Review agent tetap wajib untuk: `high`, `cross-repository`, perubahan kontrak API/event/data, autentikasi, otorisasi, role/permission, migration, dependency, infrastruktur, data sensitif, komponen/skema bersama, validasi otomatis yang tidak memadai, dan setiap trigger wajib relevan lainnya. Untuk `single-repo-medium`, independent review dipertahankan bila ada perilaku produksi, aturan bisnis, area bersama, atau risiko regresi bermakna.

Owner-only hanya boleh untuk `local-low` bila seluruh kondisi berikut benar: tidak ada perubahan material perilaku produksi; tidak berdampak auth/authz atau data sensitif; tidak ada perubahan kontrak API/data, dependency, migration, atau infrastruktur; tidak berdampak pada shared area berisiko tinggi; validasi relevan ada dan lulus; serta tidak ada trigger review wajib. Rekam bukti berikut:

```text
Review mode: owner-only
Reason:
Review triggers evaluated:
Validation evidence:
```

Review agent bersifat read-only kecuali Orchestrator secara eksplisit menugaskan perbaikan. Temuan memuat severity, workspace, file/baris bila tersedia, dampak, dan arahan perbaikan.

## Peran dan checklist owner

### Product Owner / Manager

Membuat Product Manifest: masalah, tujuan, prioritas, user story, scope/out of scope, keputusan produk, acceptance criteria teruji, dampak API/data/security/operasional, serta pertanyaan yang benar-benar menghalangi. Tidak mengubah kode.

### Orchestrator

Memvalidasi manifest, mengklasifikasikan risiko, menetapkan task/owner/workspace/kontrak/gate, mengumpulkan handoff, dan menjalankan loop review hingga blocker ditutup. Koordinasikan kontrak API sebelum salah satu sisi bergantung padanya.
Untuk `cross-repository`, owner frontend dan backend baru mulai setelah contract
status `Agreed`, kedua owner menyetujui contract version, product ambiguity
tidak ada, dan compatibility expectation direkam; review integrasi independen
wajib memverifikasi versi akhir.

### Frontend agent

Memiliki `squat-fe`: UI, client state, integrasi API, aksesibilitas, dan test frontend. Sebelum handoff: verifikasi behavior terhadap acceptance criteria, error/loading/empty state yang relevan, aksesibilitas, kontrak payload/error/status yang digunakan, serta validation frontend yang relevan. Laporkan perubahan kontrak API secara eksplisit kepada Orchestrator dan jangan mengasumsikan perubahan backend.

### Backend, Database, DevOps, Security

Backend memiliki endpoint, logika bisnis, validasi server, otorisasi, dan test. Database menjaga skema, integritas, indeks, kompatibilitas migration, rollback, dan risiko data loss; migration hanya disiapkan untuk persetujuan, tidak diterapkan tanpa persetujuan eksplisit. DevOps menilai CI/CD, environment, deploy, observability, dan rollback hanya dalam dua workspace; source of truth infra di repo lain adalah handoff/blocker. Security meninjau auth/authz, data sensitif, dependency, atau infrastruktur; owner area memperbaiki temuannya.

## Blocker, review loop, dan completion

Semua blocker harus ditutup sebelum task selesai. Temuan actionable dikembalikan ke owner yang tepat; temuan kontrak lintas-area ditugaskan ke semua owner terdampak. Setelah perbaikan, owner menjalankan ulang validasi dan mengirim resolution handoff; reviewer memverifikasi resolusinya.

Dua repair loop adalah **escalation checkpoint**, bukan batas jumlah perbaikan. Setelah dua loop, hentikan pengulangan otomatis, task tetap open/blocked, lakukan root-cause analysis, nilai ulang scope, kontrak, ownership, kebutuhan specialist, dan temuan reviewer, lalu rekam keputusan eksplisit: lanjut dengan perbaikan lebih sempit; reassign owner; minta klarifikasi Product Owner; revisi/buka ulang kontrak; tambah specialist; pecah task; atau gunakan proses risk-acceptance yang berwenang. Task tidak boleh ditandai selesai hanya karena dua loop tercapai, dan risk acceptance tidak boleh diam-diam menghapus blocker.

## Context lifecycle dan klasifikasi data

Buat context dari manifest dan keputusan aktif. Distribusikan child context hanya berisi: subset manifest relevan, `AGENTS.md` yang berlaku, target file relevan, dependensi langsung, kontrak aktif, blocker aktif, dan validasi khusus peran. Jangan meneruskan secara default transcript penuh, riwayat parent lengkap, prompt agent lain, seluruh repo, diff/log CI penuh, diskusi selesai, atau dokumen tak terkait.

Pada checkpoint, simpan ringkasan berikut lalu retire context yang sudah tidak relevan: current objective, product decisions, technical decisions, contract, files changed, validation evidence, open blockers, security findings, next owner, dan source references. Jangan retire blocker, temuan security, keputusan kontrak, atau acceptance criteria yang belum selesai.

Klasifikasi data: `Public`, `Internal`, `Confidential`, `Restricted`. Manifest, checkpoint, dan handoff tidak boleh memuat password, access/API token, private key, connection string penuh, session cookie, identifier personal yang tidak perlu, customer PII, atau record produksi sensitif mentah. Gunakan ringkasan faktual minimal, identifier tersamarkan, dan source reference. Ketersediaan connector tidak memberi otorisasi untuk mengambil data secara luas.

## Handoff dan pengukuran

Handoff owner normalnya maksimal sekitar 300 kata (tanpa menghilangkan blocker, temuan security, atau perubahan kontrak):

```text
Parent task ID:
Owner:
Scope completed:
Files changed:
Behavior changed:
API or data contract impact:
Validation executed:
Validation results:
Review status:
Open blockers:
Security or privacy impact:
Data sources used:
Known risks:
Next owner or reviewer:
```

Jangan sertakan full diff/transcript, credential, atau PII. Pengukuran memakai `Parent task ID` sebagai unit utama dan mengagregasikan root + seluruh child session: jumlah root/child/agent, input cached/non-cached, output/total token, file inspected/changed, command validasi, review loop, blocking finding, rework, completion time, final status, escaped defect, dan regression. Evaluasi memakai count, median, p90, minimum, maksimum, serta distribusi per risk class—bukan rata-rata sesi saja.

### Dedicated parent-task session lifecycle

Setiap parent task independen harus memakai **satu root session khusus**. Jangan
menjalankan parent task independen lain di root session tersebut. Root hanya
boleh memuat manifest parent, orkestrasi, implementasi, child agent yang
diwajibkan, validasi, review, repair, handoff, measurement, dan closure untuk
parent itu saja.

Workflow `local-low` yang memenuhi seluruh bukti owner-only memakai satu root
orchestrator/owner; Product Owner child, reviewer independen, atau specialist
hanya ditambahkan bila intent ambigu atau trigger berlaku. Untuk
`single-repo-medium` dengan perubahan perilaku produksi/aturan bisnis, gunakan
owner implementasi dan independent reviewer; Product Owner child/specialist
hanya bila dipicu. Aturan review, blocker, data, dan validation lain di dokumen
ini tetap berlaku tanpa pengecualian.

Selesaikan penulisan/revisi policy, review `AGENTS.md`, template, changelog,
analisis pilot sebelumnya, dan instruksi pilot **sebelum** membuka root khusus.
Kerja persiapan itu tidak boleh dibebankan ke metrik implementation task.
Catat baseline root saat mulai, setiap child saat spawn, dan total final saat
selesai menggunakan template lifecycle. Total parent adalah delta root khusus
ditambah total final semua child yang terhubung eksplisit. Jangan menghitung
reasoning dua kali bila `total_tokens` log sudah mencakup usage terkait.

## Compaction

Compaction hanya eksperimen opt-in di masa depan; capability CLI bukan persetujuan aktivasi. Jangan mengubah `.codex/config.toml`, `model_auto_compact_token_limit`, atau setting compaction aktif tanpa otorisasi eksplisit. Compaction tidak eligible bila acceptance criteria ambigu, kontrak belum selesai, blocker/temuan security masih terbuka, analisis migration aktif, critical review sedang berjalan, atau keputusan wajib belum tersimpan dalam manifest/checkpoint.

## Model dan reasoning

- Gunakan model yang diizinkan konfigurasi efektif (maksimum `gpt-5.6-terra`); reasoning mengikuti konfigurasi efektif sesi/workspace.
- Product Owner/Manager menggunakan reasoning seperlunya untuk brief ringkas.
- Jika satu model saja tersedia, semua sub-agent mewarisi model sesi; instruksi peran dan reasoning tetap membedakan kedalaman pekerjaan.
- Jangan menurunkan security review atau review migration ke mode hemat.
