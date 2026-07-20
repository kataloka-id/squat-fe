# Changelog orchestration policy

## 2026-07-20 — Phase 2 instruction-layer pilot

| Field | Record |
| --- | --- |
| Date | 2026-07-20 |
| Changed files | `squat-fe/AGENTS.md`, `kataloka-main-be/AGENTS.md`, `docs/codex-orchestration-templates.md`, `docs/codex-orchestration-changelog.md` |
| Previous policy | Role, handoff, and review loop existed, tetapi belum memiliki manifest per parent task, risk triage terukur, context lifecycle, data classification, escalation checkpoint, dan measurement template yang seragam. |
| New policy | Product dan Orchestration Manifest menjadi source of truth; review dipicu risiko; owner-only dibatasi untuk `local-low`; blocker closure, context/data controls, checkpoint, dan measurement per parent task distandardkan. |
| Reason | Mengurangi duplikasi konteks dan fan-out tidak relevan tanpa melemahkan product intent, security, review, atau closure blocker. |
| Affected risk classes | `local-low`, `single-repo-medium`, `cross-repository`, dan `high`. |
| Compatibility impact | Tidak mengubah kode produk, API/data contract produk, database, deployment, launcher, connector, atau configuration. Owner harus memakai manifest dan handoff baru pada task berikutnya. |
| Validation performed | Review kebijakan lintas FE/BE, pemeriksaan kontradiksi, `git diff --check`, dan status worktree. |
| Pilot requirement | Policy memasuki pilot pada 3–5 parent task representatif sebelum adopsi permanen; ukur kualitas dan metrik per parent task. |
| Rollback condition | Roll back bila Product Owner brief terlewat, blocker/review/security gate terlewat, kontrak inkonsisten, rework/critical regression meningkat, atau kualitas turun. |

Compaction **tidak diaktifkan**. Pengaturan compaction, `.codex/config.toml`,
dan product code tidak berubah. Mandatory independent review tetap berlaku untuk
risiko yang terpicu; owner-only adalah pengecualian terbatas bagi task
`local-low` yang memenuhi seluruh syarat.

## 2026-07-20 — Phase 3 policy-alignment correction

| Field | Record |
| --- | --- |
| Changed files | `squat-fe/AGENTS.md`, `docs/codex-orchestration-changelog.md` |
| Previous policy | Instruksi menyebut reasoning `ultra` sebagai konfigurasi proyek. |
| New policy | Instruksi memakai model yang diizinkan dan mengikuti reasoning pada konfigurasi efektif sesi/workspace. |
| Reason | `.codex/config.toml` saat ini menetapkan `model_reasoning_effort = "medium"`; policy tidak boleh mengklaim nilai efektif yang berbeda. |
| Compatibility impact | Tidak ada perubahan konfigurasi, model, compaction, atau kode produk. Security dan migration review tetap tidak boleh diturunkan demi penghematan. |
| Validation performed | Review diff Phase 2 dan `git diff --check`. |
| Pilot requirement | Tetap menjalankan pilot kebijakan pada parent task berisiko rendah. |
| Rollback condition | Revisi bila policy kembali bertentangan dengan konfigurasi efektif atau melemahkan review kritis. |

## 2026-07-21 — Dedicated-root measurement clarification

| Field | Record |
| --- | --- |
| Changed files | `squat-fe/AGENTS.md`, `docs/codex-orchestration-templates.md`, `docs/codex-orchestration-pilot-execution.md`, `docs/codex-orchestration-changelog.md` |
| Previous policy | Pengukuran parent task belum mewajibkan root session khusus atau baseline/final cumulative token snapshot. |
| New policy | Pilot efisiensi memakai satu root khusus per parent task, lifecycle session terstruktur, dan total parent berbasis root delta ditambah child yang terhubung eksplisit. |
| Reason | Analisis pilot menemukan long-lived root context diwariskan ke child dan mendistorsi pengukuran token. |
| Compatibility impact | Tidak mengubah product code, risk/review trigger, launcher, connector, configuration, atau compaction. |
| Validation performed | Review instruction/template, `git diff --check`, dan isolated-root re-test terpisah. |
| Pilot requirement | Re-test local-low harus dimulai dari root khusus setelah preparation selesai. |
| Rollback condition | Revisi jika lifecycle menghilangkan linkage/evidence atau menurunkan quality gate. |

## 2026-07-21 — Final policy adoption and Pilot 4 closure

| Field | Record |
| --- | --- |
| Final phase date | 2026-07-21 |
| Changed files | `squat-fe/AGENTS.md`, `kataloka-main-be/AGENTS.md`, `docs/codex-orchestration-templates.md`, `docs/codex-orchestration-pilot-execution.md`, `docs/codex-orchestration-changelog.md` |
| Permanent policy | Dedicated root per independent parent task; constrained lightweight `local-low`; independent review for applicable `single-repo-medium` and all mandatory triggers. |
| Evidence | Local-low isolated-root samples: 3; token range 73,154–111,044; median 109,582; validation pass rate 100%; blockers/rework 0; average agents 1. Isolated medium: 332,950 total tokens; 2 agents; independent review completed; validation passed; blocking findings 0. |
| Comparison caveat | Earlier-pilot comparisons are directional; they do not guarantee identical savings for every future task. |
| Pilot 4 Parent task ID | `PT-2026-07-21-XREPO-DEFERRED-01` |
| Pilot 4 status | Deferred, not failed: no explicit Product Owner-approved cross-repository product task or ticket was available. No artificial contract or FE/BE product change was created. |
| Final adoption decision | Adopt with operational monitoring. |
| Remaining limitations | Runtime lacks a reliable pre-task token snapshot and parent-thread linkage for independently launched reviewer sessions; sample size remains limited. |
| Compaction decision | Not activated and not tested; dedicated-root isolation is retained. |
| Orchestration optimization task status | Closed. Further pilot required: No. Compaction experiment required: No. Cross-repository pilot: Deferred. Permanent policy status: Adopted with operational monitoring. |
