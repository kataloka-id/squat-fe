# Edit Test Cases pada Test Run — Manifest

## Product Manifest

| Field | Value |
| --- | --- |
| Parent task ID | Edit Test Cases pada Test Run |
| Task ID | TR-ETC-20260827 |
| Product owner | dayadi |
| Primary objective | Memungkinkan user menambah dan menghapus Test Case dari Test Run yang sudah dibuat tanpa mengubah master Test Case atau historical data yang tidak terkait. |
| Acceptance criteria | Action `Edit Test Cases` mudah ditemukan; selector konsisten dengan Create Test Run dan mendukung multi-select add/remove; add membuat execution entry tanpa duplikasi; remove hanya menghapus entry dari run dan memberi warning bila ada result/evidence/attachment; execution yang dipertahankan tetap; seluruh summary/metrics/coverage konsisten dan persisten setelah reload; permission dan lifecycle restriction ditegakkan; regression execution tetap lulus. |
| In scope | FE selector/detail/action, API contract, server validation/authorization, execution row persistence, attachment cleanup terkait execution yang dihapus, metrics/summary, focused tests dan integration validation. |
| Out of scope | Mengubah master Test Case, menghapus historical Test Run lain, mengedit Test Run `Completed`, deployment, secret, dan migration live. |
| Expected behavior | Test Run `Draft`, `In Progress`, dan `Blocked` dapat diedit Test Case-nya. Test Run `Completed` immutable dan action tidak tersedia; API tetap menolak bypass client. |
| Fixed product decisions | `Completed` tidak boleh diedit. Selain `Completed` boleh diedit. Master Test Case dan historical data yang tidak terkait tetap utuh. |

## Orchestration Manifest

| Field | Value |
| --- | --- |
| Risk class | cross-repository |
| Risk classification reason | Perubahan kontrak FE/BE, penghapusan execution/evidence, lifecycle authorization, persistence, dan derived metrics. |
| Affected repository or workspace | squat-fe; kataloka-main-be |
| Assigned owner | Frontend owner: squat-fe; Backend/data owner: kataloka-main-be |
| Required specialist | Backend/data owner; security/data review melalui independent review gate |
| Required validator | FE lint/typecheck/focused tests; BE typecheck/focused controller/domain tests; integration persistence validation |
| Required reviewer | Independent cross-repo/security/data reviewer (read-only) |
| API or data contract | `PATCH /v1/projects/:projectId/test-runs/:runId/cases` menerima `{ testCaseIds: string[], allowDraftTestCases?: boolean }` sebagai final ordered membership. Server memvalidasi project/status/duplicate, menambah execution untuk ID baru, menghapus execution yang tidak dipilih beserta step dan attachment yang dimiliki execution tersebut, mempertahankan execution lain, melakukan sync status/summary, dan mengembalikan run detail/summary terbaru. `Completed` mengembalikan error immutable. |
| Contract status | Agreed — v1 |
| Required validation gates | Migration/schema review tanpa apply; API validation; FE/BE tests; persistence-after-reload; project-scope/duplicate/permission/status tests; attachment cleanup test. |
| Required review gates | Independent cross-repo/security/data review dan revalidation setelah temuan. |
| Security trigger | Project authorization, writable-role authorization, cross-project IDs, lifecycle bypass. |
| Database trigger | Execution membership deletion and attachment ownership cleanup; no master Test Case deletion. |
| DevOps trigger | None. |
| Integration trigger | FE/BE contract, response summary, cache invalidation, reload. |
| Known blockers | Existing unrelated dirty worktree changes must be preserved. |
| Compaction eligibility | Not eligible while contract, persistence validation, or review is open. |
