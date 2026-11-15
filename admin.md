# **PansGPT — Complete Administrative System Analysis and Migration Blueprint**

Repository: [PansGPT/pansgpt](https://github.com/PansGPT/pansgpt?utm_source=chatgpt.com) · Branch: `main` · Analysis date: 13 November 2026

The most important discovery from examining the repository is that **PansGPT's administrative system is considerably larger than the admin API files suggest**.

The project's original feature inventory and implementation plan describe a multi-level administration system covering university management, students, lecturers, educational materials, academic administration, AI operations, subscriptions, security, and platform governance.

Crucially, the repository contains two different kinds of evidence:

1. **The administrative system specified in the project's documentation**, including functionality from the earlier PansGPT application that the rebuild intends to preserve.
2. **The administrative functionality actually implemented in the checked-in source**, which is considerably narrower.

Since your objective is to migrate the functionality into another version of PansGPT, both matter. The original feature specification tells us what the system is supposed to support; the source code tells us what can currently be reused.

The documentation also references an older sibling codebase, `pansgpt-eli`, which is not contained in the GitHub repository you've provided. That means I can document its described functionality, but I cannot claim to have inspected that older application's source code.

## **1. The four management levels**

The detailed architectural specification identifies **three administrative tiers and one separate academic staff role**.

**Level 1 — Platform Super Admin**

Manages the entire PansGPT platform, all participating universities, global AI configuration, platform-wide users, resources, costs, and security.

**Level 2 — Senior University Admin**

Manages one university, including its standard administrators, student and lecturer accounts, subscription privileges, academic sessions, and institution-wide governance.

**Level 3 — Standard University Admin**

Manages everyday academic operations, including lecture materials, document approvals, timetables, examinations, restrictions, and academic information.

**Level 4 — Lecturer / Academic Contributor**

Has a separate faculty workspace for submitting academic materials, monitoring approvals, and managing permitted exam restrictions.

These are not four interchangeable administrator accounts.

The intended system uses a hierarchy in which each category has a different responsibility and authorization boundary.

### **The essential distinction**

A Platform Super Admin can operate across multiple universities. A Senior University Admin governs a single institution and its administrators. A Standard University Admin performs designated operational duties without controlling higher administrative privileges. A Lecturer contributes academic content without becoming a university administrator.

For migration purposes, **preserving these distinctions is one of the most important requirements**.

### **Important implementation discrepancy**

The planned architecture distinguishes `university_admin` accounts using an additional `admin_level` of `senior` or `standard`.

However, the current database role enum contains only:

`student`, `lecturer`, `university_admin`, `super_admin`

The current administrative endpoints do not implement the proposed senior-versus-standard separation. Consequently, that distinction must be implemented in the new application rather than assumed to exist in the source.

Sources: [Implementation plan, Sections 3, 14 and 15](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com) · [Database role definitions](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260906090001_extensions_and_uuidv7.sql?utm_source=chatgpt.com)

## **2. Administration permission matrix**

The following reflects the intended responsibilities described in the repository's planning documents. It is a **migration permissions blueprint**, not a claim that every permission has already been enforced in production.

| Functionality                  | Super Admin         | Senior University Admin  | Standard University Admin | Lecturer        |
| ------------------------------ | ------------------- | ------------------------ | ------------------------- | --------------- |
| Manage universities            | All                 | Own institution, limited | No                        | No              |
| Create university admins       | Yes                 | Standard admins only     | No                        | No              |
| Manage students                | Across universities | Own university           | Restricted                | No              |
| Change student subscriptions   | Yes                 | Yes                      | No                        | No              |
| Approve lecturer accounts      | Yes                 | Yes                      | Subject to delegation     | No              |
| Submit academic materials      | Yes                 | Yes                      | Yes                       | Yes             |
| Approve academic materials     | Yes                 | Yes                      | Yes                       | No              |
| Manage timetables              | Yes                 | Yes                      | Yes                       | No              |
| Manage exam restrictions       | Yes                 | Yes                      | Yes                       | Permitted scope |
| Manage academic sessions       | Yes                 | Yes                      | Limited                   | No              |
| Execute semester rollovers     | Yes                 | Yes                      | No                        | No              |
| Manage university AI knowledge | Yes                 | Yes                      | Yes                       | No              |
| View platform-wide AI costs    | Yes                 | No                       | No                        | No              |
| Configure global AI settings   | Yes                 | No                       | No                        | No              |
| Inspect global audit logs      | Yes                 | No                       | No                        | No              |
| Inspect university audit logs  | Yes                 | Yes                      | As authorized             | No              |
| Suspend entire universities    | Yes                 | No                       | No                        | No              |

Where the plans do not specify exact delegation rules—for example, whether a Standard University Admin can approve lecturer accounts—those permissions should be explicit decisions in the new system, not inherited assumptions.

# **Part II — Platform Super Admin**

## **3. Platform-wide administration**

The Platform Super Admin is the highest authority in PansGPT. This role is not supposed to belong to an individual university.

The implementation plan proposes a separate interface under `/super-admin/*`.

Its responsibilities extend across every institution, user population, academic resource, AI service, and platform operation.

## **3.1 University management**

This is the foundation of the entire multi-university system.

The Super Admin needs to manage universities as separate institutional workspaces rather than simply selecting a university name on individual user accounts.

### **University records**

The existing `universities` database table contains the following fields:

| Field        | Meaning                                    |
| ------------ | ------------------------------------------ |
| `id`         | Unique university identifier               |
| `name`       | Full institution name                      |
| `short_name` | Abbreviated name                           |
| `slug`       | Unique URL-friendly institution identifier |
| `country`    | Country, defaulting to Nigeria             |
| `state`      | State in which the university is located   |
| `status`     | Currently `active` or `suspended`          |
| `created_at` | University registration timestamp          |
| `updated_at` | Latest modification timestamp              |

The more ambitious Super Admin specification proposes an extended university lifecycle:

Provisioning

Active

Suspended

Archived

It also proposes a `read_only` state.

These statuses have different meanings:

**Provisioning:** The university is being configured. Its institutional record, initial administrator, academic configuration, and access permissions may not yet be ready.

**Active:** The university is operating normally, and authorized students and staff can access its enabled services.

**Suspended:** The platform has administratively disabled the university's access. The intended design requires this restriction to be enforced by the backend, not merely displayed in the dashboard.

**Read-only:** An institution may be allowed to retrieve existing information while modifications or other specified operations are prohibited. The precise permitted operations still need a defined policy.

**Archived:** The institution is no longer operating as an active tenant but its records may need to remain available for administrative, legal, or retention purposes.

The source database currently supports only `active` and `suspended`. The five-state model comes from the architectural specification.

### **University provisioning workflow**

The planned Super Admin system includes an atomic university provisioning operation.

A complete provisioning workflow would involve creating the university, associating its initial Senior University Admin, establishing its academic context, applying initial resource limits, and recording the operation.

The specification emphasizes atomicity: a failure should not leave an institution partially created with inconsistent permissions.

For the new version, the provisioning process should be a guided flow in which the administrator enters institutional details, configures ownership and resource allocations, reviews the setup, and activates the workspace.

### **University overview**

The planned API is intended to return university records together with student counts and storage usage.

A complete university overview should be able to present a university's identity, operational status, administrative ownership, student population, lecturer population, resource consumption, current academic session, and recent administrative activity.

Only some of those fields exist directly in the current schema. Others would require aggregation queries or new data models.

### **University suspension and reactivation**

A Super Admin should be able to change an institution's lifecycle state with appropriate safeguards.

For a system that serves multiple universities, suspension must have consequences across the platform:

- New authentication or privileged operations should respect the suspension.
- Student and lecturer API calls should be checked against the institution's current state.
- Background jobs should have an explicit policy for paused, cancelled, and already-running work.
- Existing academic records should be preserved unless a separate retention policy authorizes deletion.
- The action should be auditable and reversible where appropriate.

The old specification establishes university suspension as a platform capability. The precise enforcement model above is an implementation requirement for the migration.

**Current source status:** The university table exists, and authenticated users can retrieve universities through the auth API. A complete Super Admin university-provisioning and lifecycle-management API has not been found.

Sources: [University database schema](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260906090002_identity_and_tenancy.sql?utm_source=chatgpt.com) · [Super Admin governance specification](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)

## **3.2 Platform administrator management**

The planned Super Admin role has authority to provision Senior University Administrators.

This is different from inviting lecturers or registering students.

An administrator account needs both a verified identity and an authoritative permission assignment.

In the specified hierarchy, a Platform Super Admin can assign a person to administer a particular university. That account can then operate within that institution's scope.

For migration, the required operations should include viewing existing administrators, adding an administrator, changing their permitted role, suspending or revoking administrative access, and reviewing their recent administrative activity.

A Senior University Admin should be able to create Standard University Admin accounts for their own institution but should not be able to promote someone to Platform Super Admin.

### **Important security requirement**

Administrator creation, role modification, and removal must be enforced by backend authorization.

An ordinary user must not be able to gain administrative privileges by modifying browser data, JWT metadata, or a general-purpose profile update request.

The current code already addresses part of this risk: the October 2026 authorization migration revokes direct client mutation of the `public.users` table, and the API reads roles from the authoritative database.

However, the proposed senior/standard assignment and delegation workflow still needs implementation.

## **3.3 Global AI analytics and operational costs**

The Super Admin specification includes a significant AI analytics system.

It is intended to show AI consumption and operational cost across all participating universities.

This is especially important because PansGPT uses external AI providers and performs several computationally expensive operations, including chat generation, document retrieval, embedding, and quiz generation.

### **Data proposed for tracking**

The `ai_usage_daily_rollups` table in the design specification contains:

| Metric               | What it measures                               |
| -------------------- | ---------------------------------------------- |
| Usage date           | Day the activity occurred                      |
| University           | Institution responsible for consumption        |
| Model                | Specific model used                            |
| Provider             | AI provider handling the request               |
| Request type         | Chat, quiz, retrieval, or another AI operation |
| Total requests       | Number of recorded calls                       |
| Successful requests  | Completed calls                                |
| Failed requests      | Unsuccessful calls                             |
| Prompt tokens        | Input-token consumption                        |
| Completion tokens    | Output-token consumption                       |
| Total tokens         | Combined usage                                 |
| Estimated cost (USD) | Calculated operational expenditure             |
| Average latency      | Mean processing time                           |

The system is designed around daily aggregation rather than repeatedly processing every raw request just to produce dashboard totals.

### **Analytics capabilities**

At the platform level, the administrative interface should provide a global summary, per-university comparisons, provider-level cost breakdowns, model-level consumption, request success and failure rates, and historical trends.

For example, a Super Admin should be able to identify whether one institution is responsible for a disproportionate share of AI consumption, whether a provider is becoming unreliable, and which operations are driving the largest processing expenses.

The specification also mentions cache-hit analysis and the ability to trigger daily aggregation.

### **Proposed API contracts**

`GET /api/super-admin/ai-analytics/summary`

`GET /api/super-admin/ai-analytics/costs`

`POST /api/super-admin/ai-analytics/aggregate-daily`

These are **specified routes, not verified implemented endpoints**.

The current code has AI telemetry infrastructure, but the dedicated Super Admin analytics service, daily rollup workflow, and frontend are not yet established as complete.

## **3.4 Platform resource quotas**

The architectural plan extends university records with resource limits.

Proposed fields include:

| Field                     | Proposed default   |
| ------------------------- | ------------------ |
| Maximum storage           | 15 GiB             |
| Monthly token quota       | 100 million tokens |
| Current storage usage     | Tracked bytes      |
| Current cycle token usage | Tracked tokens     |

The distinction between _allocation_ and _usage_ is important.

A storage allocation is how much a university is permitted to consume. Current usage is the amount it has already consumed.

For migration, the Super Admin's resource interface should distinguish resource limits, measured usage, quotas remaining, cycle resets, and what happens when a limit is exceeded.

The repository specification supplies the underlying data fields but does not fully define how every limit is enforced. That enforcement requires deliberate design.

## **3.5 Global AI configuration**

PansGPT has a `system_settings` table containing:

- `system_prompt`
- `temperature`
- `maintenance_mode`
- `web_search_enabled`
- `rag_threshold`
- `updated_by`
- `updated_at`

These fields are important because they affect system behaviour rather than the personal preferences of an individual student.

The implementation plan describes a more advanced governance system in which sensitive AI prompt changes require **four-eyes approval**.

Four-eyes approval means a proposed modification is reviewed by a second authorized person before it becomes active.

### **Intended approval process**

1. Super Admin proposes a sensitive system configuration change
2. System records the existing value, proposed value, author, and reason
3. A second authorized reviewer examines the proposal
4. Approved changes are applied; rejected changes leave the active configuration untouched
5. The system retains an audit history for subsequent investigation or rollback

The existing `system_settings_history` table already contains a foundation for recording prior configuration values, responsible users, change reasons, and timestamps.

However, the four-eyes approval engine itself is part of the intended architecture, not a verified working feature of the current source.

The same applies to the planned Super Admin interface for modifying provider configuration, managing enabled AI skills, and undertaking vector-index maintenance.

## **3.6 Global audit logs and compliance**

The administrative specification calls for append-only, structured audit logging.

The proposed enhanced audit record contains:

| Property       | Purpose                                     |
| -------------- | ------------------------------------------- |
| Actor          | Person or service that performed the action |
| Actor role     | Authorization level at the time             |
| Admin level    | Senior or standard where applicable         |
| University     | Institutional context                       |
| Action         | Operation performed                         |
| Category       | Type of administrative event                |
| Target type    | Kind of resource changed                    |
| Target ID/name | Exact resource affected                     |
| Previous state | Information before modification             |
| New state      | Information after modification              |
| Metadata       | Additional operation context                |
| IP address     | Request origin                              |
| User agent     | Client information                          |
| Timestamp      | When the event occurred                     |

The specification includes categories such as access control, user management, academic operations, AI configuration, security incidents, and system maintenance.

The global audit interface should allow Super Admins to investigate administrative changes across the platform, including the responsible actor and the before/after state of significant mutations.

The current schema includes an `audit_logs` table, but the more detailed `access_control_audit_logs` structure appears in the implementation specification. Their differences must be reconciled during migration.

Source: [Section 15 — Platform administration, analytics, security and audit logging](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)

# **Part III — Senior University Admin**

## **4. University-level governance**

The Senior University Admin manages a university as an institution, not the overall PansGPT platform.

This role should be bound to a specific `university_id`.

Its purpose is to give institutional leadership control over the university's students, lecturers, academic configuration, and delegated administrators without granting access to other institutions.

## **4.1 Student management**

The original PansGPT inventory identifies student management as a central function of the University Admin dashboard.

The detailed administrative specification expands this into a student roster and lifecycle-management system.

### **Student directory**

The proposed endpoint is:

`GET /api/admin/students`

It is intended to support a paginated student directory with searching and filtering.

The documented filters include academic level, subscription tier, and account status.

The existing user schema supplies the following core information:

| Attribute               | Description                 |
| ----------------------- | --------------------------- |
| User ID                 | Stable account identifier   |
| Email                   | Account email               |
| First name              | Student's first name        |
| Last name               | Student's last name         |
| University ID           | Institution                 |
| Current level           | Academic level              |
| Roles                   | Assigned system roles       |
| Subscription tier       | `free` or `pro`             |
| Account deletion marker | Soft-deletion state         |
| Creation date           | Account registration date   |
| Updated date            | Latest profile modification |

### **Proposed student status lifecycle**

The admin specification proposes:

`active`, `suspended`, `banned`, `pending_verification`

These are more specific than the currently implemented user deletion field.

An **active** student has normal access according to their subscription and permissions.

A **suspended** student has access temporarily restricted, with a recorded administrative reason.

A **banned** student has a more serious account restriction. The policy for reinstatement should be distinct from routine temporary suspension.

A **pending verification** student has an account whose required eligibility or identity verification is incomplete.

### **Student administration actions**

The original plans specify that a university administrator should be able to find students, invite users, suspend or delete accounts, and manage access.

The more detailed plan explicitly proposes status changes and batch operations.

`PATCH /api/admin/students/{id}/status`

`POST /api/admin/students/batch`

Batch operations are intended to cover changes such as tier upgrades, academic-level promotions, and suspensions.

### **Important workflow details**

For the migration, a student-management action needs a defined scope and result.

When an administrator suspends a student, the system should store the affected account, reason, responsible administrator, timestamp, and resulting status. Access restrictions must then be checked by the backend.

Changing a student's academic level should update the relevant academic context, affecting which university materials and schedules the student receives.

Changing a subscription should update entitlements without silently altering transaction history.

Batch operations should report individual successes and failures rather than merely returning one ambiguous success message.

These are implementation details necessary to reproduce the intended functionality reliably.

**Current status:** The student-profile schema and role authorization foundations exist. Dedicated student-roster, suspension, banning, promotion, and batch-management APIs are not present in the inspected API routers.

## **4.2 Student subscription and entitlement management**

The intended Senior University Admin can manage student subscription tiers. Standard University Admins are explicitly prohibited from this capability.

The current `public.users` table defines `subscription_tier` as `free` or `pro`.

The repository also contains separate credit-management tables:

- `user_credits`
- `credit_ledger`
- `credit_pricing`
- `credit_purchases`

These distinguish subscriptions from usage credits and payment history.

### **Relevant financial information**

`user_credits` stores the user's current credit balance, lifetime earned credits, lifetime spent credits, and last grant timestamp.

`credit_ledger` records individual credit transactions, including the transaction type, amount, resulting balance, reference, and metadata.

`credit_pricing` stores costs for actions such as AI chat, RAG search, quiz generation, flashcard generation, and document export.

`credit_purchases` stores purchase information, including provider, amount in kobo, currency, transaction reference, and payment status.

An `admin_adjustment` transaction type also exists.

For the new version, these should be treated as related but distinct administration concerns:

**Subscription management** controls which plan a student belongs to.

**Credit management** controls usage balances and recorded credit movements.

**Payment management** concerns the underlying financial transaction and its verification.

A Senior Admin's ability to change a subscription tier does not automatically imply authority to fabricate payments, rewrite credit ledger entries, or issue refunds.

The legacy specification does not fully define the boundary between university-level adjustments and platform-level financial operations, so that boundary requires an explicit permission policy.

Source: [Credit, pricing, purchase and entitlement schemas](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260911010001_phase4_database_foundation_complete.sql?utm_source=chatgpt.com)

## **4.3 University administrator management**

One of the defining capabilities of the Senior University Admin is the ability to manage **Standard University Admins**.

This is distinct from managing students or lecturers.

The senior administrator should be able to delegate permitted operational responsibilities within their institution while retaining control over higher-risk activities such as subscription changes and semester rollovers.

The intended system must prevent a standard administrator from elevating their own privileges.

A complete administrative assignment should therefore record the account, university, administrative level, assigning authority, status, and audit history.

Again, the current `user_role` enum does not distinguish senior and standard administrators. The new version needs a reliable representation of that distinction, preferably using a normalized administrator-membership model rather than trusting a frontend-only property.

## **4.4 Lecturer account governance**

Senior University Admins are responsible for lecturer approval and account lifecycle management.

The original specification describes a lecturer registration workflow in which applicants can be:

`pending` → `active`

or

`pending` → `rejected`

An active lecturer may subsequently become `suspended`.

### **Lecturer application information**

The proposed lecturer profile includes:

| Field            | Description                                  |
| ---------------- | -------------------------------------------- |
| User account     | Linked authentication identity               |
| University       | Institution applying to                      |
| Academic title   | Mr, Mrs, Miss, Ms, Dr, Prof, Pharm, Pharm Dr |
| Full name        | Lecturer identity                            |
| Email            | Contact and login email                      |
| Phone number     | Contact information                          |
| Status           | Pending, active, rejected, suspended         |
| Approved by      | Approving administrator                      |
| Approved at      | Approval timestamp                           |
| Rejection reason | Explanation when rejected                    |
| Created/updated  | Record history                               |

### **Approval workflow**

A lecturer submits the required details and receives a pending application status.

An authorized university administrator reviews the applicant, decides whether to approve or reject the application, and records the decision.

Approval is intended to activate lecturer privileges.

Rejection preserves a reason and prevents the applicant from proceeding as an approved faculty member.

Suspension removes access to privileges while preserving historical records.

### **Important difference from the current implementation**

The current code contains a **lecturer invitation and redemption system** that directly grants the lecturer role through a valid invitation.

The old implementation specification describes a separate **lecturer application and administrator approval workflow**.

These are not equivalent.

The new version must deliberately decide whether lecturers are admitted through approval, invitation, or a combination of both.

If both are retained, the flow should clearly distinguish an invited but unregistered lecturer, a registered applicant awaiting approval, an approved active lecturer, and a suspended lecturer.

Otherwise, automatically granting the lecturer role through invitation redemption could bypass the intended application-review process.

Sources: [Implemented lecturer invitations](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/admin.py?utm_source=chatgpt.com) · [Lecturer approval specification, Section 14](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)

## **4.5 Academic session and semester management**

The repository contains an `academic_terms` table associated with individual universities.

Its core fields are:

| Field              | Meaning                   |
| ------------------ | ------------------------- |
| `university_id`    | Institution               |
| `academic_session` | Session such as 2026/2027 |
| `semester`         | First or second           |
| `updated_by`       | Responsible user          |
| `updated_at`       | Modification timestamp    |

The Senior University Admin is intended to configure the current academic context and perform semester rollovers.

This function has consequences far beyond updating a label.

For example, changing the active semester can affect which timetable is relevant, which academic materials should be prioritized, and how students' current academic context is interpreted.

### **Semester rollover**

The architectural specification gives Senior University Admins the authority to execute rollovers and explicitly denies this power to Standard University Admins.

A robust rollover should therefore distinguish changing the current academic term from advancing student cohorts.

A semester change does not necessarily mean every student progresses from 300 level to 400 level. Those are separate academic operations and should be independently authorized.

The new version should preserve previous academic history, avoid deleting previous materials, and clearly identify the consequences before a rollover is committed.

**Current status:** The academic-term schema exists. A completed admin academic-term management or rollover service was not found in the current API routers.

# **Part IV — Standard University Admin**

## **5. Day-to-day academic operations**

The Standard University Admin is the operational administrator.

According to the repository specification, this user should have substantial control over academic materials and schedules but not over other administrators, student subscriptions, or institution-wide semester rollovers.

This role may handle a considerable volume of administrative work without having the authority to change the university's overall governance.

## **5.1 Academic library management**

Academic document management is one of the most developed parts of the existing backend.

The feature's purpose is to make course materials available to students in an organized, institution-specific library and to the AI retrieval system.

### **Document creation**

The upload process requires a document's identity and academic metadata.

The fields supported by the API include:

| Field                  | Required or optional | Detail                           |
| ---------------------- | -------------------- | -------------------------------- |
| Document title         | Required             | 2–255 characters                 |
| Course code            | Required             | 2–20 characters                  |
| Course title           | Required             | 2–255 characters                 |
| Topic                  | Optional             | Up to 255 characters             |
| Lecturer name          | Optional             | Up to 150 characters             |
| Academic session       | Optional             | Session identifier               |
| Semester               | Optional             | `first` or `second`              |
| Target academic levels | Supported            | Array of 100–600 levels          |
| Original filename      | Required             | Name of uploaded document        |
| MIME type              | Validated            | Must match permitted extension   |
| File size              | Validated            | Must not exceed configured limit |

The default target level in the upload request is `400`.

The supported file formats are PDF, DOC, DOCX, PPT, and PPTX.

The system does not treat course code as interchangeable with the course title. A document can be associated with both a machine-friendly course identifier and a human-readable course name.

### **File storage**

Uploaded files use Cloudflare R2, with a university-specific storage path generated by the backend.

The API first creates a document record and returns a temporary presigned upload URL. The frontend then uploads the file directly to storage and calls the confirmation endpoint.

This architecture prevents the browser from needing unrestricted storage credentials and reduces the amount of file data that must pass through the API server.

### **Upload permissions**

The current implementation differentiates between a lecturer and an administrator.

An upload created by a university or platform administrator receives `active` status.

An upload created by a lecturer receives `pending_review` status.

This is a significant distinction to preserve: administrator-submitted documents are trusted differently from lecturer submissions.

However, a production migration may still need an explicit policy about whether every administrator upload should bypass review or whether additional review is required for sensitive content.

## **5.2 Document approval and review**

The current document lifecycle uses these status values:

| Status           | Meaning                       |
| ---------------- | ----------------------------- |
| `pending_review` | Awaiting authorized review    |
| `active`         | Approved for use              |
| `rejected`       | Not approved                  |
| `archived`       | Retained but no longer active |

The database also separately tracks background processing.

That means the document's **approval status** and its **ingestion status** are different concepts.

A document can be approved while processing is still pending. Approval does not imply that its vector index is already available.

### **Approval and ingestion states**

CONTENT APPROVAL

Pending review

Active

BACKGROUND INGESTION

Pending

Processing

Completed

The ingestion pipeline also has a `failed` state requiring recovery or retry.

The API supports retrieving processing progress, total indexed chunks, and ingestion completeness.

A document-detail response may also include detected document segments and image counts.

### **Approval behaviour in source code**

When an administrator changes a document's status to `active`, the update handler records the reviewing administrator and the review time.

The approval path also checks the uploaded storage object and attempts to arrange ingestion processing.

The implementation deliberately distinguishes cases where approval succeeds but storage verification or queueing does not.

For migration, those cases must not be represented as a fully completed document-processing operation.

### **Rejection**

The original Lecturer Portal specification requires an administrator to provide a reason when rejecting submitted materials.

The `documents` table already contains a `review_note` column, but the current document patch request does not expose `review_note` as an editable field.

The dedicated lecturer-material rejection API described in the legacy plan is also not present in the current router inventory.

Therefore, **the planned rejection-note workflow is not fully reproduced by the current document metadata endpoint**.

This needs implementation in the new version.

## **5.3 Material resubmission and cancellation**

The detailed Lecturer Portal specification describes a separate `lecturer_material_submissions` model.

It records individual submissions, linked lecturers, document files, approval decisions, cancellation details, and relationships between an original rejected submission and its replacement.

### **Intended resubmission rules**

The specification describes a strict one-resubmission constraint per rejected submission.

It also describes preserving a parent-child relationship between the original submission and the corrected replacement.

That is important because the system should not overwrite historical review decisions whenever a lecturer submits a revised document.

The audit history must remain understandable:

Original submission → Rejection → Corrected resubmission → New review decision.

### **Cancellation**

Lecturers are intended to be able to cancel pending submissions.

Cancellation should mark the submission as cancelled and safely clean up an unneeded stored file.

The specification requires checking whether a stored object is referenced elsewhere before deleting it.

This prevents removing a file that has already become part of an active library document.

**Migration status:** The described submission table, dedicated resubmission workflow, and cancellation endpoints are part of the legacy specification. They should not be treated as implemented merely because the current generic document upload API exists.

## **5.4 Document management after approval**

The current backend supports several useful administrative operations beyond uploading.

**Editing metadata:** Administrators can modify academic information without necessarily replacing the underlying file.

**Viewing document details:** The API returns document identity, university, course, file properties, review state, embedding progress, and segmentation information.

**Soft deletion:** The administrator can mark a document as deleted. The system uses a `deleted_at` field, which is safer for retention and reference management than immediately deleting every associated record.

**Re-embedding:** Administrators can request a replacement ingestion run. The repository's remediation documentation describes preserving the previous searchable index until the replacement is safely committed.

**Access restrictions:** Student access is tied to active documents belonging to the student's university. Lecturer and administrator permissions are broader for review purposes.

### **Library interaction with the student-facing application**

The student library catalog supports searching, pagination, sorting, and filtering.

Relevant supported filters include course code, academic session, semester, and document collection.

The library is also integrated with the student's reading history, so previously opened materials can appear in recent-document views.

The admin interface should not duplicate this catalog as an unrelated data store. Administrative operations should modify the same authoritative academic records consumed by the student application.

Sources: [Document management implementation](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/library.py?utm_source=chatgpt.com) · [Student catalog integration](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/library_catalog.py?utm_source=chatgpt.com) · [Ingestion recovery design](https://github.com/PansGPT/pansgpt/blob/main/docs/phase-0-7-remediation-2026-10-20.md?utm_source=chatgpt.com)

## **5.5 Weekly class timetable management**

This is one of the few admin CRUD systems that is genuinely implemented in the current API.

The administrator can create, retrieve, update, and delete weekly timetable entries.

### **Timetable structure**

A timetable entry belongs to a university and academic level.

It contains a day, course code, course title, venue, time slot, optional structured start/end times, and optional effective-date boundaries.

The system supports Monday through Saturday for weekly classes.

Students retrieve recurring class occurrences based on their verified university and level.

### **Existing timetable API**

| Method | Endpoint                              |
| ------ | ------------------------------------- |
| GET    | `/api/v1/admin/timetables`            |
| POST   | `/api/v1/admin/timetables`            |
| PATCH  | `/api/v1/admin/timetables/{entry_id}` |
| DELETE | `/api/v1/admin/timetables/{entry_id}` |

The GET endpoint supports filtering by level and institution.

The backend enforces institution scope, checks permitted academic levels, and validates typed time ranges.

### **Different administrator behaviour**

For a `super_admin`, the current timetable API requires an explicit `university_id`.

For a `university_admin`, the university is derived from the authenticated user context, preventing the administrator from selecting another institution as the target.

### **Missing user interface**

The repository roadmap specifically states that the weekly timetable editor was deferred on 5 November 2026.

The student-facing timetable tab also retained a Coming Soon state.

Therefore, the current API can manage timetable records, but the original full visual timetable experience has not been reproduced in the checked-in web frontend.

### **Legacy capabilities to preserve**

The older specification describes a more advanced timetable administration system including individual class CRUD, clearing the timetable for an academic level, extracting timetable entries from uploaded files using AI, reviewing extracted entries, and publishing approved batches.

The intended import flow is:

1. Administrator uploads a timetable document, image, or text
2. AI extracts proposed courses, days, time slots, venues, and related information
3. System presents an editable structured preview
4. Administrator corrects any extraction errors
5. Validated entries are published into the institution's timetable

The old plan names `extract-ai` and `batch-publish` endpoints. These have not been found in the current API implementation.

For the new version, preserving this workflow matters because entering an entire academic timetable manually can be substantially more work than reviewing an uploaded schedule.

## **5.6 Examination timetable management**

PansGPT distinguishes recurring lecture timetables from date-specific examination schedules.

The existing database includes an `exam_timetables` table.

It stores:

| Field        | Description          |
| ------------ | -------------------- |
| University   | Owning institution   |
| Target level | Student cohort       |
| Course code  | Exam course          |
| Course title | Course name          |
| Exam date    | Calendar date        |
| Start time   | Beginning of exam    |
| End time     | End of exam          |
| Venue        | Examination location |

The original specification goes further, describing examination types such as written/theory exams, CBTs, OSCEs, practicals, and oral examinations.

It also describes a chronological student-facing exam timeline with countdowns, examination venue information, and automatically selected schedule views during examination periods.

### **Planned administrator actions**

The original API contract includes creating, editing, listing, and deleting examination entries, as well as clearing the examination timetable for an academic level.

These are separate from the implemented weekly class timetable CRUD.

The new administration system should preserve this distinction.

It is also important to reconcile the documented model with the current table: the existing exam timetable schema does not contain every field described in the richer legacy UX, including the specified examination paper-type metadata.

Sources: [Current timetable models](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/models/academic.py?utm_source=chatgpt.com) · [Exam timetable schema](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260911010001_phase4_database_foundation_complete.sql?utm_source=chatgpt.com) · [Legacy timetable specification, Section 13](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)

## **5.7 Exam restrictions and AI lockouts**

This is one of the most distinctive administrative features in the original PansGPT design.

A lecturer or authorized university administrator is intended to be able to temporarily restrict students from using specific AI study tools during examinations or continuous assessment tests.

This is not simply a notice or warning. The specification requires backend enforcement.

### **Restriction information**

The existing `exam_restrictions` table includes:

| Field                 | Purpose                                 |
| --------------------- | --------------------------------------- |
| University            | Institution where restriction applies   |
| Created by            | Administrator or staff account          |
| Title                 | Name of restriction                     |
| Course code           | Optional specific course                |
| Academic level        | Cohort affected                         |
| Start time            | Beginning of restriction                |
| End time              | End of restriction                      |
| Reason                | Explanation for restriction             |
| Status                | Scheduled, active, completed, cancelled |
| Creation/update times | Record history                          |

### **Scope**

A restriction can be targeted to a specific academic level or, as the specification describes, a course within that level.

This is intended to prevent indiscriminately restricting unrelated users or courses.

### **Duration options**

The legacy interface specifies duration presets of 15 minutes, 30 minutes, 45 minutes, 1 hour, 2 hours, and 3 hours, plus a custom duration.

It also supports scheduled start and end timestamps.

### **Enforcement**

The original design specifically calls for protected chat and quiz operations to respond with HTTP `423 Locked` when a relevant exam restriction is active.

A student attempting to access a restricted tool should receive an explanation of the restriction.

The system should not rely on disabling a button in the browser: a student could bypass a browser-only restriction by calling the API directly.

### **Cancellation and expiration**

The intended interface shows live restriction countdowns.

Authorized lecturers can cancel restrictions, with cancellation tracked in the audit history.

Restrictions can also naturally expire when their end time has passed.

The distinction between scheduled, active, completed, and cancelled status must be handled consistently.

### **Implementation status**

The restriction database table exists.

However, the current roadmap explicitly marks exam-restriction management and AI enforcement middleware as unfinished. The current router inventory does not include the dedicated exam-restriction management API described in the plan.

**For migration:** The database model is a starting point, but it is not sufficient to reproduce the actual feature. The permission checks, restriction evaluation, API interception, lecturer controls, cancellation workflow, and user-facing error handling must also be implemented.

## **5.8 Course knowledge and academic context**

The platform contains a `course_knowledge` table.

It associates a university, academic level, optional course code, and a block of knowledge text.

Its documented purpose is to provide curriculum context to the AI system.

This allows PansGPT to respond with greater awareness of the educational environment in which a student is studying.

For example, university-specific course information should be distinct from general information supplied by an AI model.

The intended University Admin functionality includes managing this academic knowledge.

### **Governance considerations**

Academic knowledge is shared institutional information, whereas a student's personal notes are private user content.

The new admin system needs to distinguish those categories.

A Standard University Admin may be permitted to maintain approved curriculum knowledge but should not automatically gain unrestricted access to students' personal conversations, notes, or academic activity.

**Current status:** The `course_knowledge` schema and supporting RLS policies exist. Complete admin CRUD routes and a dedicated editor were not found in the current implementation.

# **Part V — Lecturer Portal**

## **6. Academic staff workspace**

Although a Lecturer is not a university administrator, the Lecturer Portal is an essential component of the overall administration system because it initiates academic workflows that administrators must supervise.

The original specification proposes the following frontend routes:

| Route                    | Purpose                               |
| ------------------------ | ------------------------------------- |
| `/lecturer`              | Faculty dashboard                     |
| `/lecturer/materials`    | Academic material submissions         |
| `/lecturer/restrictions` | Examination study lockouts            |
| `/lecturer/help`         | Faculty documentation and support     |
| `/lecturer/profile`      | Academic identity and account details |
| `/lecturer/pending`      | Account approval status               |

These routes are part of the legacy design specification. They are not present as dedicated pages in the current Next.js route tree.

## **6.1 Lecturer dashboard**

The specified dashboard contains a lecturer identity header, verified university affiliation, summary statistics, and recent activity.

The summary statistics are:

**Active Restrictions:** Currently active examination lockouts created or managed by the lecturer.

**Pending Submissions:** Academic materials awaiting administrative review.

**Approved Materials:** Submissions accepted for academic use.

The recent activity timeline combines material-review events with exam restriction activity.

This gives lecturers a quick overview of their administrative and educational contributions without granting them access to the institution's broader governance dashboard.

## **6.2 Materials workspace**

This is where lecturers submit course materials for inclusion in the university's shared academic library.

The legacy interface describes a file-upload form with course and academic-level selection.

It also describes a submission list with filters for Pending, Approved, Rejected, and Cancelled.

Each submission can have a detailed review drawer showing status, reviewer feedback, timestamps, and relevant processing progress.

Rejected materials are intended to support a resubmission modal.

Approved materials are processed into the document library's retrieval infrastructure.

For the migration, this should remain separate from the administrator's approval queue. The lecturer owns the submission workflow; the administrator controls approval.

## **6.3 Lecturer exam restriction workspace**

The lecturer is intended to see their existing restrictions, create permitted lockouts, monitor countdowns, and inspect historical restrictions.

The original design includes an active-lockouts grid and a quick restriction-creation modal.

The interface must be consistent with the permissions enforced by the API. If lecturers are permitted to create restrictions for only their assigned university or courses, the backend must enforce those limits independently of the frontend form.

## **6.4 Lecturer account status**

The original registration design includes different responses for existing lecturers:

| Existing status   | Intended behaviour                                           |
| ----------------- | ------------------------------------------------------------ |
| Pending           | Explain that the application is awaiting review              |
| Active            | Explain that faculty access is already enabled               |
| Rejected          | Return a conflict and direct the applicant to administration |
| Suspended/revoked | Deny access to protected lecturer operations                 |

This is a more complete account-status model than the present invitation-only API.

The lecturer profile is also intended to contain academic title, contact details, university affiliation, and security preferences.

## **6.5 Help and faculty support**

The specified Lecturer Help Center contains expandable frequently asked questions covering account approval, exam restrictions, material submissions, supported formats, and direct administrator support.

This is a distinct faculty support experience, not a platform-wide support administration console.

The original specification mentions a direct admin/WhatsApp support channel, but does not establish a completed messaging integration in the current source.

Source: [Section 14 — Lecturer Portal specification](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)

# **Part VI — Other administrative capabilities**

## **7. AI skills and system behaviour**

Beyond the major portals, PansGPT's database contains administrative infrastructure for AI feature management.

The `ai_skills` table is intended to describe available AI capabilities. Its schema belongs to the broader AI subsystem, while database policies restrict privileged mutations to Super Admins.

This implies an important separation between **student-facing AI tools**, **institutional academic knowledge**, and **global AI system configuration**.

Students use AI features. University administrators manage institution-specific academic context. Platform administrators govern the global configuration and supported skills.

The legacy specification also mentions configuring AI behaviour using system prompts, temperature, web search availability, and retrieval thresholds.

These should not all be exposed as unrestricted editable settings to every administrator.

## **8. Support, feedback, and user issues**

The original PansGPT product inventory includes feedback submission, reporting problems, contact, and FAQ functionality.

The existing database contains a support-ticket system.

### **Support ticket structure**

| Field      | Values or purpose                               |
| ---------- | ----------------------------------------------- |
| User       | Account that submitted the ticket               |
| Subject    | Issue title                                     |
| Category   | `bug`, `account`, `content`, `billing`, `other` |
| Status     | `open`, `in_progress`, `resolved`, `closed`     |
| Priority   | `low`, `normal`, `high`, `urgent`               |
| Timestamps | Creation and updates                            |

Related tables include `support_ticket_replies` and `csat_survey_responses`.

Ticket replies record the sender, message, timestamp, and whether the reply is an internal note.

Customer satisfaction responses capture a rating from 1 to 5, feedback text, and feature area.

### **Administrative implications**

These data models provide a basis for an administrative support system.

A support management interface could include a ticket inbox, issue details, threaded replies, internal notes, priorities, statuses, and satisfaction reporting.

However, those screens and their operational API routes have not been confirmed as implemented in the current application.

The migration should therefore preserve the data concepts while treating the complete administrative support console as a separate implementation task.

## **9. Email administration**

The repository includes database structures for email history and delivery controls.

`email_logs` records recipients, email templates, provider message IDs, delivery states, and failures.

`email_suppressions` records addresses suppressed because of bounces, spam complaints, or manual unsubscribe actions.

`user_email_preferences` stores user-level email preferences.

The original email plan includes welcome messages, verification, password reset, payment receipts, lecturer invitations, university announcements, and re-engagement messages.

The current lecturer-invitation API already makes a direct Resend email request.

The broader plan, however, envisages handling email through background jobs so that API operations do not have to wait on email delivery.

For migration, email logs should not be confused with a fully implemented administrative email campaign interface. The schemas exist, but a complete message-management console has not been established.

## **10. Security and audit infrastructure**

The current database uses PostgreSQL row-level security, and the API includes its own authorization checks.

These are complementary mechanisms.

**API authorization** determines whether the current user is permitted to perform an operation.

**Institutional scoping** determines which university's records the operation may affect.

**Database policies** restrict which data authenticated database clients can access.

**Audit logging** records what an authorized actor actually changed.

The October 2026 authorization migration is particularly important: it restricts direct client mutation of sensitive user records and pushes application-level changes through the API.

The new version should retain this principle. A sophisticated administrative dashboard is not secure if it merely hides prohibited actions while leaving unrestricted database mutations possible.

### **Sensitive information**

A university administrator's ability to manage students should not automatically mean permission to read their private AI conversations, personal notes, or generated learning history.

Those personal data categories have separate owner-scoped policies in the source.

Any new administrator access to personal information needs a specific purpose, explicit permission checks, and appropriate auditability.

Sources: [Support, email, credits and governance tables](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260911010001_phase4_database_foundation_complete.sql?utm_source=chatgpt.com) · [Authorization boundaries](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20261020090000_authorization_boundaries.sql?utm_source=chatgpt.com) · [RLS policies](https://github.com/PansGPT/pansgpt/blob/main/packages/database/migrations/20260906090008_row_level_security.sql?utm_source=chatgpt.com)

# **Part VII — Actual implementation versus the intended system**

## **11. Verified API inventory**

To reproduce the system correctly, it is useful to separate endpoints that exist in the current source from those appearing only in design documents.

### **Implemented administrative or staff operations**

| Operation                       | Actual API                                          |
| ------------------------------- | --------------------------------------------------- |
| Generate lecturer invitation    | `POST /api/v1/admin/lecturers/invite`               |
| Check invitation                | `GET /api/v1/auth/invites/{token}`                  |
| Redeem invitation               | `POST /api/v1/auth/invites/{token}/redeem`          |
| List class timetables           | `GET /api/v1/admin/timetables`                      |
| Create class timetable          | `POST /api/v1/admin/timetables`                     |
| Modify class timetable          | `PATCH /api/v1/admin/timetables/{entry_id}`         |
| Delete class timetable          | `DELETE /api/v1/admin/timetables/{entry_id}`        |
| Initialize document upload      | `POST /api/v1/library/upload`                       |
| Confirm document upload         | `POST /api/v1/library/{document_id}/confirm-upload` |
| List library documents          | `GET /api/v1/library/documents`                     |
| Get document details            | `GET /api/v1/library/documents/{document_id}`       |
| Update document metadata/status | `PATCH /api/v1/library/documents/{document_id}`     |
| Soft-delete document            | `DELETE /api/v1/library/documents/{document_id}`    |
| Request re-embedding            | `POST /api/v1/library/{document_id}/reembed`        |

The library also exposes additional document retrieval, preview, and segment operations.

These source routes provide the current foundation. They do not establish a full administrative user interface.

### **Specified but not found as implemented administrative endpoints**

The original plans include the following separate systems:

| Area                   | Intended operations                                   |
| ---------------------- | ----------------------------------------------------- |
| University lifecycle   | Provision institutions and change lifecycle states    |
| Student accounts       | Search roster, change status, perform batch actions   |
| Administrator accounts | Provision and manage institutional admins             |
| Lecturer approval      | List applicants, approve, reject, suspend             |
| Lecturer submissions   | List, approve, reject, cancel, resubmit               |
| Academic context       | Configure academic sessions and rollovers             |
| Exam schedules         | Create, edit, list, delete, bulk import               |
| Exam lockouts          | Create, list, cancel, enforce restrictions            |
| Global analytics       | AI usage summary, model/provider costs, daily rollups |
| Audit log explorer     | Query global or institution-scoped events             |
| AI configuration       | Govern global settings and prompt changes             |
| Support operations     | Process tickets and internal notes                    |

These are not all equally mature.

Some have database tables. Others have architectural proposals. Some have no corresponding implementation in the current routers.

The right migration approach is to preserve the specified behaviour without pretending that every proposed API can simply be copied from the current code.

## **12. Key architectural inconsistencies to resolve**

There are several differences between the written design and the implementation.

| Area                    | Specification                                          | Current source                                                        |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Admin hierarchy         | Super, Senior University, Standard University          | Super and University roles; no enforced senior/standard tier          |
| Admin routes            | `/super-admin/*` and `/admin/*` frontend portals       | No dedicated admin frontend routes found                              |
| Lecturer onboarding     | Application with approval lifecycle                    | Working invitation/redemption route                                   |
| Lecturer submissions    | Dedicated submission records and review history        | Generic document upload with approval status                          |
| University status       | Provisioning, active, suspended, read-only, archived   | Active/suspended database enum-like check                             |
| Student account status  | Active, suspended, banned, pending verification        | `deleted_at`, role/profile foundations; no full status implementation |
| Academic administration | Class and exam CRUD, extraction, import, phase control | Class timetable CRUD implemented                                      |
| Restrictions            | Course/level lockouts enforced by the API              | Database foundation; enforcement unfinished                           |
| Audit history           | Enhanced immutable before/after records                | Basic audit table exists                                              |
| Global AI analytics     | Daily rollups with cost and usage dashboards           | Telemetry foundation without the full admin console                   |

Two technical issues deserve special attention.

**First, the planned Platform Super Admin is not supposed to require a university affiliation.** The existing lecturer-invitation endpoint calls `require_university` before selecting a target university. Consequently, a truly university-unaffiliated Super Admin cannot use that path as the architecture intends without a change.

**Second, the current code does not consistently use a single interpretation of administrator roles.** Some permission dependencies recognize the legacy string `admin`; the authoritative database enum uses `university_admin`. The new system should have one consistent role model.

These are not cosmetic differences. They affect who can perform important administrative operations and whether authorization behaves correctly.

# **Part VIII — How to reproduce this in the new PansGPT**

## **13. Recommended administrative application structure**

Based on the original feature inventory and the detailed architecture specification, I would preserve the separation between platform governance, university governance, daily academic operations, and faculty work.

The following is my proposed information architecture for the new version. **It is a reconstruction blueprint, not a list of existing frontend routes.**

**Platform Super Admin**

Overview

Universities

Platform Administrators

Users & Institutions

AI Usage & Costs

Resource Quotas

AI Configuration

Security & Audit Logs

System Operations

**Senior University Admin**

University Overview

Students

Lecturers

Administrators

Academic Sessions

Subscriptions & Entitlements

Academic Materials

Timetables & Exams

Restrictions

AI Usage

Institutional Audit Logs

**Standard University Admin**

Academic Overview

Document Library

Pending Material Reviews

Courses & Academic Knowledge

Weekly Timetables

Examination Timetables

Exam Restrictions

Processing Status

**Lecturer**

Faculty Overview

My Materials

Submit Material

Review Feedback

Exam Restrictions

Profile

Help

There are two possible implementations of this navigation.

A separate portal can be provided for each role, matching the original specification.

Alternatively, Senior and Standard University Admins can share the same administrative application, with the navigation and available actions derived from backend permissions.

For the rebuild, the second option would reduce duplication while preserving the security distinction between the two roles.

The Platform Super Admin should still have a clearly differentiated workspace because its responsibilities and tenant-scoping rules are fundamentally different.

## **14. Core migration workflows**

The following workflows should be treated as important acceptance criteria.

### **A. Create a university and assign its administrator**

The Super Admin creates an institution, provides its details, establishes the initial academic context, assigns the Senior University Admin, configures resource limits, and activates the university.

Successful completion should produce a university that can accept students and staff, with correctly scoped permissions.

A failed provisioning operation must not leave partially assigned administrator privileges.

### **B. Admit a lecturer**

A lecturer can enter the system through the chosen invitation or application process.

The account is associated with a university and receives a defined status.

If review is required, an authorized administrator evaluates the application and makes an approval decision.

Only after the required approval should protected lecturer operations become available.

A university administrator must not be able to approve lecturers for another university.

### **C. Submit and approve academic content**

A lecturer uploads a supported academic document and supplies course metadata.

The material enters a pending-review state.

An administrator opens the review record, checks the associated course and uploaded file, and either approves or rejects it.

Approval permits ingestion into the academic library. Rejection requires review feedback under the legacy specification.

Ingestion progress is tracked separately, and failures must remain visible.

An approved document should become usable by the student-facing application only when all relevant publication and processing requirements are satisfied.

### **D. Publish academic timetables**

An administrator selects an institution and academic level, enters timetable information manually or uses the proposed AI-assisted import process, validates the information, and publishes the entries.

Students assigned to that university and level should subsequently receive the applicable timetable occurrences.

Changes must be reflected through the authoritative timetable API rather than through frontend-only sample data.

### **E. Restrict AI assistance during an examination**

An authorized administrator or lecturer creates a restriction with a university, level, optional course, start time, end time, and reason.

When the restriction is active, protected student requests must be evaluated against it.

A matching restricted operation returns the appropriate denial response, regardless of whether it originates in the browser, mobile app, or desktop app.

The restriction can expire or be cancelled by an authorized user.

### **F. Suspend a student**

A Senior University Admin identifies a student within the institution, selects the relevant status action, and supplies the required reason.

The backend validates institutional scope and permissions before changing the user's status.

The action is recorded for administrative accountability.

The student should not retain access through an existing session where a new restriction applies.

### **G. Perform an academic rollover**

An authorized Senior University Admin selects the institution's academic transition, reviews the affected academic context, and confirms the operation.

The system applies the transition while preserving necessary history.

This must remain distinct from independently promoting every student to another academic level.

### **H. Review platform AI usage**

A Super Admin selects a time period, reviews total consumption, compares institutions and providers, and examines the relevant usage or cost records.

Where the specification calls for aggregated reporting, the backend should use authoritative usage measurements and clearly distinguish estimates from actual charges.

## **15. Database structure that must be accounted for**

The new system should not simply copy old tables without reviewing the relationships between them.

| Domain                | Existing or proposed records                                 | Purpose                                   |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Institutions          | `universities`                                               | University identity and lifecycle         |
| Academic terms        | `academic_terms`                                             | University session and semester           |
| User identity         | `users`                                                      | Accounts, roles, affiliations             |
| Administrative roles  | Proposed enhanced admin membership/level model               | Senior and standard separation            |
| Invitations           | `invitations`, `invitation_redemptions`                      | Staff onboarding                          |
| Lecturer profiles     | Proposed `lecturer_profiles`                                 | Faculty-specific identity and approval    |
| Material submissions  | Proposed `lecturer_material_submissions`                     | Reviewable submissions                    |
| Documents             | `documents`                                                  | Published and reviewable academic content |
| Document processing   | `document_chunks`, `document_sections` and ingestion records | Retrieval and AI preparation              |
| Weekly schedules      | `timetables`                                                 | Recurring classes                         |
| Examination schedules | `exam_timetables`                                            | Date-specific exams                       |
| Exam restrictions     | `exam_restrictions`                                          | Temporary study restrictions              |
| Academic knowledge    | `course_knowledge`                                           | Curriculum-specific AI context            |
| Student subscriptions | `users.subscription_tier`                                    | Basic entitlement category                |
| Credits               | `user_credits`, `credit_ledger`, `credit_pricing`            | AI credits and usage accounting           |
| Purchases             | `credit_purchases`                                           | Payment records                           |
| AI telemetry          | `ai_telemetry`                                               | AI operational records                    |
| Aggregated analytics  | Proposed `ai_usage_daily_rollups`                            | Platform reporting                        |
| Global settings       | `system_settings`, `system_settings_history`                 | Platform configuration                    |
| Audit history         | `audit_logs`; proposed enhanced audit model                  | Administrative accountability             |
| Support               | `support_tickets`, `support_ticket_replies`                  | Issue handling                            |
| Email                 | `email_logs`, `email_suppressions`                           | Delivery and messaging records            |

The proposed tables should be introduced through migrations only after comparing their definitions with the current schema. Some of the older documentation uses table and role names that no longer match the implemented architecture.

## **16. The recommended migration order**

I would build this in the following sequence.

**Phase 1 — Roles, permissions, and tenancy**

Implement and test Platform Super Admin, Senior University Admin, Standard University Admin, and Lecturer permissions. Establish authoritative role assignment, session checks, university scoping, and audit logging.

**Phase 2 — Accounts and institutional administration**

Implement university provisioning, administrator management, student lifecycle controls, lecturer onboarding, approval, suspension, and invitations.

**Phase 3 — Academic materials**

Connect document uploads, material review, approvals, rejection reasons, ingestion tracking, resubmission, deletion, and recovery.

**Phase 4 — Academic operations**

Implement academic sessions, course knowledge, class timetables, exam timetables, AI-assisted imports, and examination restrictions.

**Phase 5 — Governance and analytics**

Add university AI analytics, platform-wide reporting, credit and subscription administration, resource quotas, support operations, global AI settings, and enhanced audit review.

**Phase 6 — Integration and verification**

Test every administrative workflow with real database policies, authentic role assignments, background workers, and the student-facing effects of each action.

An important acceptance test is that a Standard University Admin must not be able to perform a Senior University Admin action by sending a request directly to an API endpoint.

Equally, a Senior University Admin must not be able to modify another university simply by changing the `university_id` in a request.

These authorization tests are more important than whether the correct buttons are hidden from the interface.

# **Part IX — Source files for implementation**

These are the most useful entry points for transferring the architecture and existing functionality.

| Source                                                                                                                              | What to extract                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Full implementation plan](https://github.com/PansGPT/pansgpt/blob/main/docs/implementation_plan.md?utm_source=chatgpt.com)         | Original feature inventory; Sections 13–15 contain the most important timetable, lecturer, and admin specifications |
| [Build roadmap](https://github.com/PansGPT/pansgpt/blob/main/docs/build_roadmap.md?utm_source=chatgpt.com)                          | Phase 16 governance scope and explicit unfinished features                                                          |
| [Admin router](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/admin.py?utm_source=chatgpt.com)                   | Lecturer invitation creation                                                                                        |
| [Auth router](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/auth.py?utm_source=chatgpt.com)                     | Onboarding, invitation validation and redemption                                                                    |
| [Academic router](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/academic.py?utm_source=chatgpt.com)             | Implemented university-admin timetable CRUD and student schedule integration                                        |
| [Library router](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/routers/library.py?utm_source=chatgpt.com)               | Document upload, review-state changes, deletion and re-embedding                                                    |
| [Authorization dependencies](https://github.com/PansGPT/pansgpt/blob/main/apps/api/app/core/dependencies.py?utm_source=chatgpt.com) | Identity verification and role checks                                                                               |
| [Database migrations](https://github.com/PansGPT/pansgpt/tree/main/packages/database/migrations?utm_source=chatgpt.com)             | Authoritative schema and policy evolution                                                                           |

## **Final assessment**

The functionality you want to recreate is not just an admin dashboard. It is an **institutional governance system with four distinct management levels**, different permission boundaries, a shared academic content pipeline, and platform-wide operational controls.

The detailed plan establishes a much larger administrative product than the currently implemented code provides.

For your new PansGPT, I would preserve the original feature set but rebuild the administration architecture around a consistent permission model, reusable components, and unified backend services—rather than directly copying the older role handling and unfinished routes.

**There is one significant remaining evidence gap:** the current repository's own implementation plan says the original functionality came from a legacy `pansgpt-eli` codebase. To achieve an exact one-to-one clone—including every existing admin screen, form field, action, workflow, and edge case—we need that legacy source as well. Otherwise, the specification above is the strongest reconstruction supported by the repository, not a complete verification of the original running application.

That distinction is especially important before handing the new implementation to Codex: features documented in the old plans must be reproduced intentionally, while currently working API functionality should be reused and tested rather than rebuilt unnecessarily.
