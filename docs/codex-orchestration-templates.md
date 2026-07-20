# Codex orchestration templates

Gunakan template ini per **parent task**. Isi ringkas, berbasis bukti, dan tanpa
secret, credential, token, PII, atau raw sensitive data.

## 1. Product Manifest

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
Known product constraints/dependencies:
```

## 2. Orchestration Manifest

```text
Risk class: <local-low|single-repo-medium|cross-repository|high>
Risk classification reason:
Affected repository or workspace:
Assigned owner:
Required specialist:
Required validator:
Required reviewer:
API or data contract:
Contract status: <not applicable|proposed|agreed|blocked>
Expected affected files or areas:
Required validation gates:
Required review gates:
Security trigger:
Database trigger:
DevOps trigger:
Integration trigger:
Context sources:
Known blockers:
Compaction eligibility: <ineligible|future opt-in candidate>; reason:
```

## 3. Owner-only review evidence

```text
Review mode: owner-only
Reason:
Review triggers evaluated:
Validation evidence:
```

Gunakan hanya untuk `local-low` setelah seluruh syarat owner-only pada
`AGENTS.md` terpenuhi.

## 4. Context checkpoint

```text
Parent task ID:
Current objective:
Product decisions:
Technical decisions:
Contract:
Files changed:
Validation evidence:
Open blockers:
Security findings:
Next owner:
Source references:
```

## 5. Structured handoff

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

Target normal maksimal sekitar 300 kata. Jangan menghapus blocker, temuan
security, atau perubahan kontrak demi batas tersebut.

## 6. Escalation checkpoint

```text
Parent task ID:
Repair loops completed:
Unresolved blocker/reviewer finding:
Root-cause assessment:
Scope and contract reassessment:
Ownership/specialist/reviewer reassessment:
Decision: <Continue with a narrower fix|Reassign ownership|Request Product Owner clarification|Revise or reopen the contract|Add a specialist|Split the task|Use the authorized risk-acceptance process>
Planned next action and validation:
```

## 7. Parent-task measurement

```text
Parent task ID:
Risk class:
Root session count:
Child session count:
Total agent count:
Total input tokens:
Cached input tokens:
Non-cached input tokens:
Output tokens:
Total tokens:
Files inspected:
Files changed:
Validation commands:
Review loops:
Blocking findings:
Rework count:
Completion time:
Final status:
Escaped defect:
Regression:
```

Agregasikan root dan seluruh child session pada Parent task ID. Evaluasi memakai
count, median, p90, minimum, maximum, serta distribusi per risk class; jangan
memakai rata-rata session sebagai satu-satunya ukuran.

## 8. Dedicated parent-task session lifecycle

Gunakan untuk setiap parent task independen. Satu parent task memakai satu root
session baru dan khusus; jangan gunakan kembali root tersebut untuk parent
independen. Root hanya memuat pekerjaan dan closure parent tersebut.

### Session start

```text
Parent task ID:
Root session ID:
Session start timestamp:
Initial cumulative input tokens:
Initial cached input tokens:
Initial output tokens:
Risk class:
Repository:
```

### Child spawn

```text
Parent task ID:
Child session ID:
Agent role:
Parent thread ID:
Spawn timestamp:
Reason for child creation:
```

### Session completion

```text
Parent task ID:
Root final cumulative input tokens:
Root final cached input tokens:
Root final output tokens:
Child final token totals:
Total sessions:
Total agents:
Final status:
```

Calculation: root task tokens adalah final kumulatif dikurangi baseline awal;
setiap child memakai total finalnya; total parent adalah root delta ditambah
semua child yang terhubung eksplisit. Laporkan cached, non-cached, output,
reasoning, dan total recorded secara terpisah. Jangan menghitung reasoning
dua kali bila total log telah mencakup usage tersebut.

## 9. Cross-repository contract-first checkpoint

```text
Parent task ID:
Contract name / version:
Endpoint or interaction:
Request and response fields (type, optionality, nullability):
Success and error status/shape:
Default and compatibility behavior:
Frontend responsibility:
Backend responsibility:
Validation ownership:
Contract status: <Draft|Under review|Changes requested|Agreed|Reopened|Implemented|Verified>
Frontend owner approval:
Backend owner approval:
Product ambiguity:
Agreement checkpoint:
```

Owners may implement only after status is `Agreed`, both approvals are
recorded, product ambiguity is none, and compatibility expectation is stated.
Record any later contract change, revision, owner approval, and product-owner
approval when product behavior changes. Independent integration review verifies
the final contract version before closure.
