# Test Run Master Attachment Reference — Manifest

## Product Manifest

| Field | Value |
| --- | --- |
| Parent task ID | TR-ATTACHMENT-REFERENCE-20260827 |
| Task ID | TR-ATTACHMENT-REFERENCE-20260827 |
| Product owner | dayadi |
| Primary objective | Make master Test Case image attachments visible during Test Run execution without mixing them with execution evidence. |
| Acceptance criteria | Existing and newly-created Test Runs show all ready master Test Case attachments as read-only reference/evidence; Test Run uploads remain separate and deletable only in that execution; reload resolves current metadata and signed preview URLs; missing/deleted, loading, expired-URL, and error states are handled; API-to-relation-to-UI mapping and focused regression tests cover the full flow. |
| In scope | Test Run execution attachment API/query, ownership metadata, signed preview URL refresh, execution attachment UI, loading/error/empty states, and focused frontend/backend/integration tests. |
| Out of scope | Copying or reassigning master attachments, changing master ownership, applying migrations to a live environment, deployment, unrelated Test Run behavior, and storage-provider policy changes. |
| Expected behavior | A Test Run execution presents master attachments under a read-only reference section and execution uploads under a separate editable evidence section. Master deletion is never offered from Test Run. |
| Fixed product decisions | Master attachments remain owned by the master Test Case; execution attachments remain owned by the Test Run execution; the same attachment ID and current signed URL endpoint are used; no stale signed URL is persisted as source of truth. |

## Orchestration Manifest

| Field | Value |
| --- | --- |
| Risk class | cross-repository |
| Risk classification reason | Shared API/data contract, attachment ownership and deletion boundary, signed URL expiry handling, and behavior in existing plus newly-created executions. |
| Affected repository or workspace | squat-fe; kataloka-main-be |
| Assigned owner | Frontend owner: squat-fe; Backend/data owner: kataloka-main-be |
| Required specialist | Backend/data owner for ownership query and migration compatibility; security reviewer for project-scope and deletion authorization. |
| Required validator | Frontend typecheck/lint/focused tests; backend typecheck/focused tests; read-only contract/integration verification. |
| Required reviewer | Independent cross-repository integration/security/data reviewer (read-only). |
| API or data contract | `GET /v1/projects/:projectId/test-run-cases/:testRunCaseId/attachments` returns ready attachments from the execution and its source master case with `ownership` (`TEST_RUN` or `TEST_CASE`), preserving `testCaseId` and `testRunCaseId`; upload accepts only one owner target (`testRunCaseId` for execution evidence); delete is authorized by persisted ownership and never reassigns master rows; `GET /v1/attachments/:id/url` creates a fresh signed URL. |
| Contract status | Agreed for implementation in this parent task. |
| Required validation gates | Preserve dirty worktrees; schema/migration review without applying; focused API/query ownership tests; frontend loading/preview/expiry/separation tests; typecheck/lint. |
| Required review gates | Independent cross-repo review after both owner validations; re-run affected validations after findings. |
| Security trigger | Project authorization, source-execution relation authorization, and preventing master deletion from Test Run. |
| Database trigger | Existing `test_run_case_id` ownership field/migration must remain compatible; no live migration. |
| DevOps trigger | None; no deployment or secret changes. |
| Integration trigger | API relation → attachment metadata → preview URL → execution UI. |
| Known blockers | Both worktrees contain pre-existing uncommitted changes, including partial attachment ownership work; only task-related hunks may be reconciled. |
| Compaction eligibility | Not eligible while contract, migration review, or independent review is open. |

