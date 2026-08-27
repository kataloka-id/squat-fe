# Test Run Initial Load Performance — Manifest

## Product Manifest

| Field | Value |
| --- | --- |
| Parent task ID | TR-LOAD-PERF-20260827 |
| Task ID | TR-LOAD-PERF-20260827 |
| Product owner | dayadi |
| Primary objective | Membuka Test Run dengan satu primary request yang membawa data execution dan Test Case yang diperlukan untuk initial rendering, tanpa waktu load yang meningkat linear karena request per Test Case. |
| Acceptance criteria | Open Test Run menghasilkan satu primary HTTP request untuk run + seluruh execution data yang diperlukan; tidak ada GET detail Test Case per item; Test Run dengan banyak Test Case tetap menggunakan request count konstan; pindah selection tidak refetch; reload/refresh mengambil data terbaru secara predictable; execution state tetap setelah save dan reload; metadata attachment tersedia tanpa signed URL persisten; regression Test Run tetap lulus; backend tidak melakukan query database N+1 untuk execution/step/provenance/attachment. |
| In scope | FE service/query lifecycle dan state mapping; Test Run detail API response/serializer/query; set-based database query; attachment metadata aggregation; focused FE/BE/integration tests dan request-count measurement. |
| Out of scope | Mengubah aturan produk execution/result; mengubah master Test Case; signed URL/storage lifecycle; live migration/deployment/secret; lazy-load yang tidak diperlukan untuk initial rendering selain preview URL attachment. |
| Expected behavior | `GET /v1/projects/:projectId/test-runs/:runId` mengembalikan metadata run, summary, user-flow provenance, dan seluruh execution snapshot/state/steps/attachment metadata yang dibutuhkan layar. Selection menggunakan data in-memory. Preview attachment meminta signed URL hanya saat user membuka preview atau URL kedaluwarsa. |
| Fixed product decisions | Canonical execution snapshot adalah sumber data rendering Test Run; attachment metadata ready boleh diagregasikan, tetapi signed/temporary URL tidak disimpan dalam payload; refresh tetap force-refetch satu resource; duplicate Test Case tidak dibuat atau di-fetch ulang. |
| Known product constraints/dependencies | Compatibility dengan consumer `GET` lama harus dipertahankan; filter execution tetap tersedia bila dipakai oleh endpoint/list flow terpisah. |

## Orchestration Manifest

| Field | Value |
| --- | --- |
| Risk class | cross-repository |
| Risk classification reason | Perubahan API response contract lintas FE/BE, perilaku produksi dan persistence execution, attachment metadata/security boundary, serta optimasi database query. |
| Affected repository or workspace | squat-fe; kataloka-main-be |
| Assigned owner | Frontend owner: squat-fe; Backend/data owner: kataloka-main-be |
| Required specialist | Backend/data query owner; security/data reviewer for project scope and attachment ownership |
| Required validator | FE typecheck/lint/focused tests/request-count tests; BE build/lint/focused controller/query tests; integration request and persistence validation |
| Required reviewer | Independent cross-repository integration/security/data reviewer (read-only) |
| API or data contract | `GET /v1/projects/:projectId/test-runs/:runId` success `200` keeps existing envelope and adds `executions[]`. Each execution contains `id`, `position`, `sourceTestCaseId`, `testCaseSnapshot` (rendering fields only), `result`, `notes`, assignee fields, duration/executed/lastSaved, `steps[]`, `userFlows[]`, and `attachments[]` with attachment metadata plus `ownership`; no signed URL. Existing `/executions` remains backward-compatible for filtered reads. |
| Contract status | Agreed — v2 |
| Required validation gates | Baseline and post-fix HTTP request counts; many-case fixture; selection no-refetch; reload/refetch; attachment metadata; execution state persistence; backend set-based query inspection/test; FE/BE build/lint/focused tests; migration review without apply. |
| Required review gates | Independent cross-repo contract, query-plan/N+1, regression, and security review, followed by owner revalidation. |
| Security trigger | Project authorization; attachment metadata must be restricted to run executions and source master cases; no signed URL leakage or ownership bypass. |
| Database trigger | Set-based execution/step/provenance/attachment aggregation; existing indexes and compatibility; no live migration unless separately approved. |
| DevOps trigger | None; no deployment or environment/secret changes. |
| Integration trigger | Final FE/BE response mapping and one-primary-request behavior. |
| Known blockers | No current worktree changes. Production query-plan benchmark may require an authorized environment; local tests must provide the primary evidence. |
| Compaction eligibility | Ineligible while contract, validation, or review is open. |

## Cross-repository contract-first checkpoint

| Field | Value |
| --- | --- |
| Contract name / version | Test Run detail aggregate / v2 |
| Endpoint or interaction | `GET /v1/projects/:projectId/test-runs/:runId` |
| Success and error behavior | Existing success envelope/code and project-scoped error behavior remain; response is backward-compatible by addition of `executions`. |
| Frontend responsibility | Consume aggregate once, normalize without per-case fetch, keep selection local, force-refetch only on explicit load/reload or mutation completion. |
| Backend responsibility | Authorize project, return canonical snapshots and execution state, aggregate related rows set-wise, preserve attachment ownership and signed URL lifecycle. |
| Validation ownership | FE owner: request count/lifecycle/UI tests. BE/data owner: SQL/query and API tests. Independent reviewer: final contract/query/security/regression verification. |
| Contract status | Verified |
| Frontend owner approval | Agreed by FE owner after verifying RunDetail consumes the full execution set from one service call |
| Backend owner approval | Agreed by backend/data owner after verifying existing snapshot and attachment ownership sources can be aggregated without migration |
| Product ambiguity | None identified |

## Measurement and review checkpoint

| Field | Value |
| --- | --- |
| Baseline request pattern | `TestRunsService.get()` issued 2 HTTP GET requests per opened run: run metadata plus `/executions`; the existing service test required two mocked responses. Attachment UI additionally listed the selected execution on mount/selection. |
| Post-fix request pattern | `TestRunsService.get()` issues 1 HTTP GET for run metadata plus all executions; selection changes use the in-memory aggregate. Test Run attachment metadata does not list per execution and preview URL remains user-triggered. |
| Backend query evidence | Detail endpoint executes a constant number of SQL statements and its execution payload uses `step_data`, `flow_data`, and `attachment_data` grouped CTEs; no migration was added or applied. |
| Validation evidence | FE build passed; changed-file FE lint passed; focused FE tests passed 51/51; BE build passed; focused BE tests passed 14/14. |
| Independent review | Read-only contract, security/ownership, query-shape, lifecycle, and regression review found no blocking finding. Full-repo lint failures are pre-existing and outside changed areas. |
