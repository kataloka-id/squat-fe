# Update Test Run Result and Notes — Manifest

| Field | Value |
|---|---|
| Parent task ID | Update Test Run result pada Test Case dengan notes |
| Task ID | Fix step-only execution update validation |
| Product owner | User request |
| Primary objective | Memungkinkan result dan notes pada step Test Case tersimpan tanpa `TEST_RUN_INVALID_REQUEST`. |
| Acceptance criteria | Payload `{ steps: [...] }` diterima; setiap step memvalidasi UUID, result, dan notes; payload execution-level yang sudah ada tetap kompatibel; test regresi lulus. |
| In scope | Backend execution-update validator dan regression test. |
| Out of scope | Perubahan UI, database, deployment, dan perubahan aturan transisi result. |
| Expected behavior | Update step result/notes diproses oleh controller yang sudah ada dan tidak ditolak validator karena tidak memiliki field execution-level. |
| Fixed product decisions | Notes tetap nullable text maksimal 50.000 karakter; result mengikuti enum Test Run yang berlaku. |
| Risk class | cross-repository |
| Risk classification reason | Kontrak payload frontend-backend dan perilaku produksi berubah; perlu review integrasi. |
| Affected repository or workspace | squat-fe, kataloka-main-be |
| Assigned owner | Backend owner untuk validator; Frontend owner sebagai contract validator |
| Required specialist | None |
| Required validator | Backend validation tests, frontend service/component regression tests |
| Required reviewer | Independent integration reviewer |
| API or data contract | `PATCH /v1/projects/:projectId/test-runs/:runId/executions/:executionId` accepts execution fields or `steps: [{ id, result?, notes? }]`; existing response and status codes unchanged. |
| Contract status | Agreed — frontend already emits step-only payloads; backend now validates them. |
| Required validation gates | Backend targeted test/build; frontend targeted test/build; worktree diff review |
| Required review gates | Independent review of validator strictness, compatibility, and integration |
| Security trigger | Project/run/step authorization remains in controller; validator only broadens shape for authorized route. |
| Database trigger | No schema or migration change |
| DevOps trigger | None |
| Integration trigger | Yes — FE step-only payload to BE validator |
| Known blockers | None |
| Compaction eligibility | No — active cross-repository contract/review |
