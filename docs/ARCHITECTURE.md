# Trialflow · Site Operations Lab v3.0.1

A private, synthetic-data clinical trial site operations pilot created as computational project work. It models site coordination rather than clinical decisions. No EDC connection or real participant data is included.

## What is usable

- Today queue with mine/team/unassigned scopes, overdue items, QC holds, operational delay estimates and an always-visible SAE flag summary.
- Study and task entry across shipments, submissions, monitoring actions, queries, lab/EKG report review, accountability, visits, AEs, SAEs and deviations.
- Ordered coordinator, investigator, QC and filing checks. Changes immediately update the shared workspace. Reopening invalidates downstream evidence. Material edits require acknowledgement before restarting checks.
- Configurable site timezone, working days, holidays, capacity and simulation date. Study-level visit patterns, tube assumptions, fresh pickup days, selected-weekday or fortnightly frozen cadence, inventory assumptions and optional independent QC.
- Validated CSV intake with row errors and preview, duplicate protection, all-or-nothing server validation, CSV/JSON export, same-database restore points and JSON restore review.
- Verified platform sign-ins, owner bootstrap from server configuration, pending role memberships, server-enforced permissions, optimistic concurrency, atomic change/audit batches, and timestamped actor/reason/before/after history.
- Voluntary usability tasks, server task times, outcomes, self-reported observations, ease ratings and export for a small synthetic-data pilot.

## First use

1. Open the private Site and sign in with the owner’s approved account.
2. Acknowledge synthetic-data use and initialize the fictional workspace.
3. Use Today or Workboard to open a task. Record the next permitted check with a synthetic evidence reference.
4. In Shipment forecast, review task generation to add missing batches. Calendar edits never silently overwrite existing task quantities or completed checks.
5. Use Data & settings for import templates, exports, restore points and the shared baseline.

The training sandbox is available without an application membership, inside the Site’s private audience gate. It uses independent bundled fixtures and browser memory only. Its changes are not shared or verified sign-offs. The app never falls back to local storage after a shared save failure. Previous v2 browser progress is left untouched and can be downloaded for reference.

## Roles and private access

Site audience and application roles are separate. This release retains owner-only Site access and does not invite anyone. Configuring a member does not send email, add a Site viewer, or widen the Site audience. Approved testers need both a workspace membership and separately approved private Site access.

The owner receives admin/coordinator/investigator/QC permissions for solo demonstration; this is not evidence of credentials or independent QC. An independent-QC study requires a different actor who has not performed an earlier recorded check on that task. Only an admin can change this requirement on an existing study. Professional delegation remains outside this pilot.

## Computational model

A task is an ordered state machine. A QC hold blocks progress; resolving it returns to the same QC check. A workflow becomes complete only when every check is recorded. Source AE/SAE/deviation flags are stored separately and are never closed by local workflow completion.

Impact policy score = bounded urgency (0–50) + operational impact (8/20/35) + waiting age (0–15). Deadline-first and shortest-first are alternative comparators. Unblocked SAE follow-ups precede other work for every policy. A sequential pooled-team scheduler maps remaining effort onto site working days; over 180 working days is marked beyond the model horizon. QC-held tasks are visible but excluded from the capacity queue. Forecast dispatch dates constrain shipment estimates. Scores are operational heuristics, not calibrated clinical probabilities.

Forecast = weekly visits × scenario volume × fresh/frozen tubes per visit, with dated visit tasks overriding the weekly estimate. Frozen inventory carries across pickups. Fortnightly dates falling on holidays/closed days move to the next working date. Courier delay uses site working days. Opening inventory is an assumption at the start of every rolling forecast, not a live stock ledger. No sample stability, packing compliance or viability is assessed.

Generated task IDs encode study/sample kind/planned date to prevent duplicates. Existing mismatches are surfaced for explicit review. Generated shipments may be prepared in advance but cannot record dispatch/receipt before their planned pickup date.

## Code map

| Path | Purpose |
|---|---|
| `public/domain.mjs` | Shared rules, validation, scheduling, forecast, CSV parser |
| `public/trialflow.mjs` | Interface, forms, scoped training sandbox |
| `public/trialflow.css` | Self-contained responsive visual design |
| `lib/pilot-api.mjs` | Server identity, roles, mutations, CAS, audit, restore, pilot sessions |
| `lib/seed.mjs` | Explicit synthetic workspace fixtures |
| `db/schema.ts`, `drizzle/` | Drizzle-owned D1 schema and schema-only migration |
| `app/api/[...path]/route.ts` | Worker API route binding |
| `tests/pilot.test.mjs` | New domain/API tests with real SQLite adapter |
| `lib/legacy/` | Preserved earlier model and 21 regression tests |

The interface and server use JavaScript/TypeScript with SQL storage. Vinext provides the Worker routing/runtime; the visible interface uses plain JavaScript modules. Cloudflare D1 persists a small versioned workspace document plus separate member, audit, snapshot and pilot-session tables. There are no third-party font or analytics requests and no AI model calls.

## Run and validate

Use Node 22.13+ and the checked-in lockfile. `npm run install:ci`, `npm test`, and `npm run build`. Schema changes use `npm run db:generate`; migrations are schema-only. Hosted migrations apply during deployment. Never create/alter tables from a request handler. For local D1, build once and apply the generated SQL with Wrangler using `dist/server/wrangler.json`; do not replay applied migrations.

Production requires the `DB` D1 binding and secret `SITE_OWNER_EMAIL`, configured through the hosting environment. Identity comes only from the platform’s trusted authenticated-user headers. No production mock-auth bypass exists. API tests construct synthetic identities entirely inside test requests. Local managed-preview browser checks use the explicitly labelled in-memory training sandbox.

Pilot bounds: at most 50 studies, 1,000 records and 400 KB serialized workspace; CSV intake 100 rows / 200 KB; request bodies 500 KB. Audit reads paginate by 100, pilot reads are bounded to 100 admin sessions or 30 own sessions, and restore-point lists to the latest 20. These are small-pilot boundaries, not an enterprise deployment.

## Responsible use and next validation

This version uses deterministic logic, not machine learning or an LLM. It does not interpret lab/EKG findings, classify event reportability, submit safety reports, or make clinical decisions. All dates are synthetic operational examples, not regulatory reporting time limits. There is no EDC synchronization, polling, webhook, writeback, automated escalation email or notification service.

Use synthetic operational metadata only. The banner is a scope instruction, not an automated PHI detector. Do not enter names, participant identifiers, medical narratives or results. A real-data deployment needs institution/sponsor-approved infrastructure, privacy/security review, professional delegation, retention/backup policy, validation and protocol-specific workflow approval. Same-database restore points do not provide offsite disaster recovery. Audit entries have no app update/delete endpoint but are not claimed to be tamper-proof regulated records or compliant electronic signatures.

Before EDC integration, identify the vendor, obtain approved API/export access, define study/site mappings and source timestamps, test idempotency and failure/reconciliation behavior, and validate event-state handling. The UI accurately reports EDC as disconnected.

The usability screen supports a future 3–5 tester study; no human usability study has been conducted by this build. Pilot outcomes are self-reported; elapsed time includes breaks. The project explanation in Project notes covers the computational logic, responsible-AI boundaries, demonstrated skills and a short application description. Review and understand the implementation and credit assistance accurately.

The first-use guide on Today links calendar review, reviewed shipment-task generation and recording a check. Platform sign-in/sign-out links navigate at the top level, including embedded views. Expired or unauthorized authentication clears the displayed shared workspace and returns to the access screen.
