# Test Case Section Usage Counter — Manifest

## Product Manifest

| Field | Value |
| --- | --- |
| Parent task ID | test-case-section-usage-counter-20260827 |
| Task ID | TC-SECTION-USAGE-20260827 |
| Product owner | User (Product Owner) |
| Primary objective | Make Section usage visible and protect Test Case structure when deleting Sections. |
| Acceptance criteria | Each Section displays the actual number of linked Test Cases; the count includes all project Test Cases, not only the visible UI slice; the count refreshes after create, move/change Section, bulk move, delete Test Case, reload, and other membership changes; an empty Section can be deleted when permission allows; a Section used by one or more Test Cases cannot be deleted; the API rejects direct/bypassed deletion with a clear usage count and the FE explains that Test Cases must be moved or detached first; deleting a Section never moves or deletes Test Cases; counter and delete protection remain correct under stale/concurrent state; focused regression coverage exists for catalog and Test Case flows. |
| In scope | Section catalog API/query response, delete protection/error contract, FE Section catalog display/delete handling, Test Case membership refresh behavior, focused backend/frontend/integration tests. |
| Out of scope | Automatic reassignment or deletion of Test Cases, schema migration unless required by evidence, production deployment, permission model changes, unrelated catalog redesign. |
| Expected behavior | Use the existing User Flow catalog usage-counter and delete-protection experience, with terminology `Test Cases`; show e.g. `12 Test Cases`; empty Sections show `0 Test Cases` and are deletable by eligible users. |
| Fixed product decisions | Counts are relational and project-scoped; delete protection is enforced by the backend/API, not only by FE; no implicit data movement or deletion; user must understand impact before confirming delete. |

## Orchestration Manifest

| Field | Value |
| --- | --- |
| Risk class | cross-repository |
| Risk classification reason | Production behavior spans FE and backend API/query/permission handling, with concurrent/stale-state and regression risk. |
| Affected repository or workspace | squat-fe; kataloka-main-be |
| Assigned owner | Frontend owner: squat-fe; Backend/data owner: kataloka-main-be |
| Required specialist | Backend/data query and transaction review; security/permission review through independent review gate. |
| Required validator | FE focused tests/typecheck/lint; backend controller/error/tests; contract and integration validation. |
| Required reviewer | Independent cross-repository/API/security reviewer, read-only. |
| API or data contract | v1: `GET /v1/projects/:projectId/sections` returns each Section with numeric `usageCount`, computed from all project-scoped `tms.test_cases` rows linked by `section_id`; delete of a used Section returns HTTP 409, code `SECTION_IN_USE`, and a message including the current number of linked Test Cases. Empty Section deletion retains existing success contract. |
| Contract status | Agreed — v1; no migration or endpoint shape change beyond additive `usageCount` and the specific existing delete error contract. |
| Required validation gates | Backend focused section/delete and membership tests; FE focused settings/catalog and Test Case mutation tests; typecheck/lint; stale/concurrent delete behavior review; no migration application. |
| Required review gates | Independent cross-repository correctness, permission, transaction, and regression review after owner validation. |
| Security trigger | Permission enforcement and direct API bypass protection. |
| Database trigger | Count query and transactional membership/delete consistency; migration not expected. |
| DevOps trigger | None. |
| Integration trigger | FE/BE additive response and 409 error contract. |
| Known blockers | Existing dirty changes in both worktrees must be preserved; no production deployment. |
| Compaction eligibility | No while implementation, contract validation, and independent review are open. |

