# Validation record · v3

Date: 2026-11-17 (America/Phoenix).

## Automated checks

`npm test`: **49 passing tests** (21 preserved model regressions + 28 new domain/API tests). The new API suite runs the real server handler against an in-memory SQLite implementation of the D1 methods, using the actual Drizzle SQL migration. It does not mock authorization decisions or enable a deployed auth bypass.

Coverage includes unauthenticated read rejection, owner-only bootstrap, approved account binding, deactivation, read-only users, coordinator/investigator separation, trusted actor attribution, sequential checks, QC failure/resolution/recheck, independent QC with another actor, invalidation on reopen/material edits, unchanged AE/SAE source flags, stale edits, simultaneous competing writes, all-or-nothing CSV imports, quoted CSV fields, row errors and duplicate IDs, shipment deduplication, dispatch date guard, inventory conservation, dated visit overrides, holiday/fortnightly handling, courier delays, timezone dates, scheduler bounds, restore copies, preserved memberships/history, unverified imported evidence and tester-owned usability sessions.

A framework production build completed successfully. The schema-only SQL migration also applied successfully to local D1.

## Browser checks

The managed preview served the real Worker routing and interface. Authentication mocking remained disabled. UI journeys used the explicitly labelled browser-memory training sandbox, not shared production data:

- Today view: open/overdue/held/risk rollups, scoped work and SAE flag summary.
- EKG investigator review → QC hold → correction → separate QC recheck → filing. The workflow displayed Completed and the dashboard’s completed count increased.
- CSV invalid study produced a row-level error and disabled import. Corrected CSV showed a preview, required synthetic-data acknowledgement, then appeared in Unassigned work.
- Manual task entry exposed shipment-specific fields and accepted a synthetic frozen batch.
- Shipment forecast displayed per-study planned/predicted dates, quantities and task-generation state.
- Voluntary task timer started, finished with feedback, and updated completion/time/ease metrics. Test feedback explicitly identified itself as an automated smoke test.
- Desktop rendering inspected visually at the browser’s supplied viewport. Responsive styles are implemented, but mobile-device testing has not been completed.

## Verification limits

The SQL adapter validates behavior with SQLite; it is not a production D1 load/concurrency certification. Live platform sign-in, separate real accounts, private-sharing flows, production restore recovery, an institutional security review and a human usability pilot remain separate validation steps. No real clinical data or EDC integration was used. No claim of GCP, HIPAA, Part 11, electronic-signature or production clinical-system compliance is made.

Publication uses the existing owner-private Site and preserves its audience. No external users are invited by this release. The owner must sign in and explicitly initialize the synthetic shared workspace on first use.

## v3.0.1 first-use refinement · 2026-11-18

Re-ran the 49 tests successfully. The deployed D1 schema was confirmed and the shared workspace was observed to be uninitialized; no production records were created or modified during this refinement.

Added one-time setup instructions and a Today guide linking calendar review, missing shipment-task generation and the first recorded check. The guide uses actual workspace task/check state and disappears after generation and a recorded check. Added top-level platform sign-in links, an explicit sign-out link, account switching for an unauthorized membership, and clearing the displayed workspace after an authentication failure.

Browser preview checks: unauthenticated gate displayed correctly; the sign-in anchor targeted the top-level page; the training guide showed 42 expected batches; task generation reduced missing batches to zero and added 42 unassigned records; recording a synthetic SAE follow-up check advanced the next action, retained the source flag and dismissed the setup guide. These checks used the clearly labelled in-memory training sandbox. Live owner authentication and a multi-user pilot remain outstanding.
