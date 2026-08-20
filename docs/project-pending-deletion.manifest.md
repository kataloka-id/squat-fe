# Project Pending Deletion Manifest

Parent task ID: project-pending-deletion-20260817
Task ID: project-pending-deletion
Product owner: User (Product Owner)
Primary objective: Make project deletion reversible until a project admin explicitly performs permanent deletion, including safe handling of project attachment objects in R2.
Acceptance criteria:
- A normal project delete marks the project pending deletion without deleting database records or R2 attachment objects.
- Pending projects are unavailable in normal project workflows and can be restored by an eligible project admin.
- Only a company `admin` whose existing `users.company_id` matches the project's `company_id` may restore or permanently delete it; `kataloka_admin` is denied for both actions.
- Permanent delete attempts to remove every associated R2 attachment object before deleting the project database record.
- If R2 cleanup fails, the project remains pending, no database cascade is run, and the user receives a clear, safe message that cleanup failed, some attachment files may already have been removed, and permanent deletion must be retried or escalated to an admin.
- Once a permanent deletion begins, restore is unavailable because an external object deletion may have partially succeeded; only permanent-delete retry remains available.
- No automatic deletion/retention scheduler is included in this task.
In scope: Backend lifecycle, authorization, database schema/migration, R2 permanent cleanup, API error contract, frontend pending-deletion actions and feedback, tests, independent review.
Out of scope: Automatic cleanup after 30 days, scheduler/deployment setup, external R2 configuration changes, data recovery after an explicitly requested permanent deletion.
Expected behavior: Pending deletion is reversible until permanent deletion begins. Permanent deletion is irreversible; R2 cleanup failure leaves a non-restorable pending project for manual retry.
Fixed product decisions: Manual trigger only; no retention. Authorization uses the existing company-admin model (`admin` role plus matching company), not a project-level role or project assignment. `kataloka_admin` may not restore or permanently delete.
Risk class: high
Risk classification reason: Production deletion lifecycle; external R2 object deletion; schema/migration; authorization; shared project access behavior; API contract change.
Affected repository or workspace: squat-fe; kataloka-main-be
Assigned owner: Frontend owner and backend owner
Required specialist: Security review for authorization and R2 failure handling
Required validator: Frontend and backend test suites; Prisma schema validation
Required reviewer: Independent reviewer
API or data contract: `DELETE /v1/projects/:id` becomes soft delete; `POST /v1/projects/:id/restore` restores; `DELETE /v1/projects/:id/permanent` permanently deletes. Standard project lists exclude pending projects; a pending-project read path is restricted to eligible company admins. R2 cleanup failure returns a safe 409 error explaining that the project remains pending and can be retried or escalated to an admin.
Contract status: Agreed, version 2.
Required validation gates: Relevant unit/controller/service tests, frontend interaction tests, TypeScript build/lint as applicable, Prisma validation.
Required review gates: Independent correctness/security/API review after owner validation.
Security trigger: Authorization change and external object deletion.
Database trigger: Project lifecycle columns and migration expected.
DevOps trigger: None; automatic scheduler explicitly out of scope.
Integration trigger: Frontend-backend lifecycle/API contract.
Known blockers: None.
Compaction eligibility: No.
