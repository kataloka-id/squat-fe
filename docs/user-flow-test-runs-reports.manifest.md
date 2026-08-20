# User Flow–Based Test Runs & Reports — Manifest

## Product Manifest

| Field | Value |
| --- | --- |
| Parent task ID | User Flow–Based Test Runs & Reports |
| Task ID | UF-TRR-20260817 |
| Product owner | dayadi |
| Primary objective | Enable project-scoped User Flow-based Test Run creation, historical provenance, and execution-derived reporting. |
| Acceptance criteria | The criteria supplied in the Product Manifest, including flow selection, persisted provenance, report filter/breakdown/quality, authorization, no-data states, and focused validation. |
| In scope | User Flow detail CTA removal; Test Run creation/detail; backend/Prisma provenance; reports and focused tests. |
| Out of scope | Redefining User Flow health, deployment, secrets, unrelated refactors, and applying migrations to a live environment. |
| Expected behavior | As specified in the Product Manifest. |
| Fixed product decisions | Test Run creation is centralized in Test Runs; Test Case execution metrics remain centralized; health is unchanged; report data is derived from execution data. |

## Orchestration Manifest

| Field | Value |
| --- | --- |
| Risk class | cross-repository |
| Risk classification reason | Frontend/backend contract, Prisma migration and immutable historical provenance, project authorization, and report aggregation change. |
| Affected repository or workspace | squat-fe; kataloka-main-be |
| Assigned owner | Frontend owner: squat-fe; Backend/data owner: kataloka-main-be |
| Required specialist | Backend/data owner (schema and migration); security review through independent review gate |
| Required validator | Frontend lint/typecheck/focused tests; backend TypeScript/focused tests; integration contract validation |
| Required reviewer | Independent integration/security/data reviewer (read-only) |
| API or data contract | v1: `POST /v1/projects/:projectId/test-runs/resolve-user-flows` accepts `{ userFlowIds, allowDraftTestCases }` and returns selected-flow count, linked count, unique eligible test-case IDs/count, deprecated exclusions, and draft cases requiring opt-in. `POST .../test-runs` accepts `userFlowIds` (and optional explicit `testCaseIds`) and server-resolves/project-validates IDs. Run detail returns immutable `userFlows`; execution rows return all originating immutable `userFlows`. `GET .../reports` accepts `userFlowId`, returns `breakdowns.userFlow` and `userFlowQuality` with nullable pass-rate/progress. |
| Contract status | Agreed — v1. Both clients retain compatibility with existing Test Case creation and existing report filters. |
| Required validation gates | Migration/schema review without applying; lint/typecheck; focused resolution/provenance/report tests; project-scope/cross-project tests. |
| Required review gates | Independent cross-repo review after owner validation; revalidation after actionable findings. |
| Security trigger | Project authorization and manually supplied cross-project IDs. |
| Database trigger | New relational provenance tables and immutable snapshots; migration prepared only, not applied. |
| DevOps trigger | None. |
| Integration trigger | FE/BE API v1 and query-state drill-down. |
| Known blockers | Existing dirty worktrees contain partial implementation; preserve it and reconcile only task-related changes. |
| Compaction eligibility | Not eligible while migration, contract validation, and independent review are open. |

## Escalation checkpoint — repair loop 2

Independent review found a report SQL placeholder defect and integration gaps between the report/test-run adapters and their API responses. The count-field contract finding was already corrected in backend repair loop 2, but must be reverified. The Product Manifest has no ambiguity and the remaining work is directly required by its acceptance criteria. Decision: continue with narrowly scoped backend report-query correction and frontend response/detail/drill-down corrections; add contract-focused tests, then perform a fresh read-only verification. No scope expansion, migration application, health-model change, or contract-version change is authorized.
