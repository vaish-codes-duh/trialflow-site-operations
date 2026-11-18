# Private Netlify deployment

This is an additional hosting adapter for the synthetic-data pilot. It keeps the existing interface, domain rules, role checks, QC workflows and API. It does not connect to an EDC or migrate the original hosted workspace.

## Project setup

1. Connect the private GitHub repository to a Netlify project.
2. Before deploying, set **Project configuration → General → Visitor access → Project visibility → Private → Production and previews**. A private repository alone does not protect the website. Leave both production and preview visibility private.
3. Use the committed `netlify.toml`. It runs `npm test && npm run build:netlify`, publishes `.netlify/trialflow/public`, and bundles functions from `netlify/functions`. The automatically detected Next.js adapter is explicitly skipped; this build serves the shared HTML/ES modules with a dedicated function.
4. In the project's Netlify environment variables, configure the values below. Redeploy after changing runtime variables.

| Variable | Value | Availability |
|---|---|---|
| `SITE_OWNER_EMAIL` | Exact email of the approved owner's Netlify account | Functions; production and any private preview being tested |
| `AWS_LAMBDA_JS_RUNTIME` | `nodejs24.x` | Configure in Netlify UI/API, including build scope |

The build uses Node 24 (`.nvmrc` and `netlify.toml`). No database URL, personal token or service credential is needed by the Blobs adapter. The function receives its Blobs binding from Netlify. An existing Netlify Database is not used by this adapter.

Free and Personal private projects are owner-only. Additional actual testers need appropriate Netlify access and a supported plan, as well as an app membership. Creating an app member does not grant Netlify access or send an invitation. Do not change visibility or purchase an upgrade merely to test another role.

## Identity and saved state

Netlify's verified `context.user` provides the account identity on private/team-login-protected projects. The function rejects missing/expired identity, missing email, missing deployment metadata and missing owner configuration. It removes all client-supplied `oai-authenticated-*` headers before passing the verified identity to the shared API. There is no local-auth bypass. Netlify CLI does not supply this protected-project identity; use the original local training sandbox and the automated tests for local work.

Each API request reads one SQLite snapshot from a site-wide Netlify Blobs store with **strong consistency**. It runs the existing SQL API against a private temporary file. A successful mutation uploads the entire snapshot with `onlyIfMatch` against the read ETag, or `onlyIfNew` for initial creation. The response reports success only after that conditional upload succeeds. A competing save returns 409 and must be refreshed and reviewed; it never overwrites the winner. Workspace changes, memberships, audit entries and restore points travel in the same atomic snapshot. Pure reads do not rewrite it after initial account binding.

Production deployments reuse `trialflow-production-v1`. Previews use separate `trialflow-preview-<deploy ID>` stores and begin empty. Redeploying a preview creates a new preview workspace. No preview writes to production. Do not manually delete or edit these blobs: deleting the production snapshot deletes its shared state and history.

At build time, committed SQL migrations generate an **empty schema-only template** outside the static publish directory. The request handler never applies schema changes. Future schema changes require an explicit migration of existing snapshots; deploying a new empty template does not migrate an existing store.

## Bounded pilot storage

This adapter is intended for a small, low-volume, synthetic-data portfolio pilot. Each changed request transfers the database, and simultaneous writers may need to refresh. The SQLite snapshot is capped at 10 MiB, including audit and restore history. Workspace limits remain 400 KB, 1,000 records and 50 studies. No automatic audit pruning or offsite recovery is implemented. Same-snapshot restore points are not disaster recovery. Export synthetic data regularly and use a properly managed relational database for larger/multi-site use.

Storage/network failure returns 503 without a confirmed-save message. As with any remote system, a timeout can be ambiguous if the storage service committed before disconnecting; refresh and inspect the record/history before retrying. Temporary files are deleted after each invocation. Source flags for AEs/SAEs remain separate from local checklist completion.

## Validation and first use

```bash
npm run install:ci
npm test
npm run build:netlify
```

Tests use real SQLite and a deterministic conditional-write store. They cover trusted identity mapping, header spoofing, cross-invocation persistence, concurrent creation/update conflicts, failure handling, storage limits, preview isolation and cleanup, alongside the existing workflow/API regression suite. They do not certify the actual Netlify platform integration.

After the first successful private deploy:

1. Confirm an unauthenticated visit reaches Netlify's login gate, including direct API/function URLs.
2. Sign in as the approved owner. Explicitly initialize the synthetic workspace.
3. Record a check with a synthetic evidence reference, reload, and verify its progress and audit entry remain.
4. Verify a second private preview has its own empty workspace.
5. Test approved additional accounts only when supported and authorized. Keep independent QC enabled where the scenario requires it.

If Netlify says production deploys are paused because credits are exhausted, restore deploy eligibility or wait for the billing reset, then retry the latest commit. Do not treat the reserved project URL or a queued build as a functioning application. A live deployment and owner sign-in must be checked before describing this adapter as hosted and validated.

References: [project visibility](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/), [verified function user](https://docs.netlify.com/build/functions/api/#user), [Blobs conditional writes and consistency](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [function runtime configuration](https://docs.netlify.com/build/functions/configuration/).
