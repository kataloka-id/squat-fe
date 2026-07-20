# Dedicated parent-task execution and measurement

Gunakan dokumen ini bersama `AGENTS.md` dan template untuk setiap parent task
independen. Ini tidak mengubah klasifikasi risiko, trigger review, atau policy
compaction.

1. Selesaikan policy/template/analisis dan tulis instruksi task sebelum root.
2. Mulai parent task pada satu root session baru dan catat baseline lifecycle.
3. Jangan memakai root tersebut untuk parent task independen lain.
4. Spawn child hanya setelah dicatat dengan Parent task ID dan relasi thread.
5. Saat selesai, ambil final root dan child, lalu hitung delta sesuai template.
6. Tandai metrik yang tidak tersedia; jangan mengestimasi atau mengaitkan sesi
   hanya dari kedekatan waktu.

Untuk `cross-repository`, selesaikan contract-first checkpoint dan kedua owner
approval sebelum implementasi; gunakan review integrasi independen sebelum
closure.

Untuk `local-low` yang memenuhi seluruh bukti owner-only, satu root
orchestrator/owner adalah workflow ringan default. Untuk `single-repo-medium`
dengan perilaku produksi atau risiko regresi bermakna, independent review tetap
wajib. Compaction tetap eksperimen terpisah dan tidak aktif.
