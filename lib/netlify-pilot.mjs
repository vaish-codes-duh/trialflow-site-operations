import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SQLiteD1} from './sqlite-d1.mjs';
import {handleApi} from './pilot-api.mjs';

export const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const KEY = 'workspace-v1.sqlite';
const errorResponse = (status, error) => Response.json({error}, {status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
}});

// Dependency injection is for deterministic server tests, never a runtime auth
// switch. The deployed entrypoint passes Netlify's verified context unchanged.
export function createNetlifyHandler({getStore, baseSnapshot, ownerEmail,
  maxSnapshotBytes = MAX_SNAPSHOT_BYTES, temporaryRoot = tmpdir()}) {
  return async function handler(request, context) {
    const user = context?.user;
    if (!user?.id || !user.email || !user.expiresAt ||
        !(new Date(user.expiresAt).getTime() > Date.now())) {
      return errorResponse(401, 'Open this private project with your Netlify team login.');
    }
    if (!ownerEmail?.trim()) return errorResponse(503, 'Workspace owner configuration is pending.');
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return errorResponse(404, 'API route not found.');
    if (!['GET', 'POST'].includes(request.method)) return errorResponse(405, 'Method not allowed.');
    // Netlify supplies deploy metadata; previews never share the production key.
    const deploy = context?.deploy;
    if (!deploy?.context || !deploy.id) return errorResponse(503, 'Trusted deploy metadata is unavailable.');
    const namespace = deploy.context === 'production'
      ? 'trialflow-production-v1' : `trialflow-preview-${deploy.id}`;

    let directory, db;
    try {
      const store = getStore({name: namespace, consistency: 'strong'});
      const existing = await store.getWithMetadata(KEY, {type: 'arrayBuffer'});
      if (existing && !existing.etag) throw new Error('Missing snapshot version');
      const bytes = existing ? Buffer.from(existing.data) : Buffer.from(baseSnapshot, 'base64');
      if (bytes.length > maxSnapshotBytes) return errorResponse(507, 'Pilot storage limit reached. Contact the workspace owner.');
      directory = await mkdtemp(join(temporaryRoot, 'trialflow-'));
      const filename = join(directory, 'pilot.sqlite');
      await writeFile(filename, bytes, {mode: 0o600});
      db = new SQLiteD1(filename);

      // Never trust identity supplied in a client header, even on direct URLs.
      const headers = new Headers(request.headers);
      for (const name of [...headers.keys()]) {
        if (name.startsWith('oai-authenticated-')) headers.delete(name);
      }
      headers.set('oai-authenticated-user-id', `netlify:${user.id}`);
      headers.set('oai-authenticated-user-email', user.email);
      const trustedRequest = new Request(request, {headers});
      const response = await handleApi(trustedRequest, {DB: db, SITE_OWNER_EMAIL: ownerEmail.trim()});
      const changed = db.dirty;
      db.close();
      db = null;
      // Failed API requests never commit identity or partial candidate state.
      if (!response.ok || !changed) return response;
      const updated = await readFile(filename);
      if (updated.length > maxSnapshotBytes) return errorResponse(507,
        'Pilot storage limit reached. This change was not saved. Export data before expanding the pilot.');
      const result = await store.set(KEY, new Uint8Array(updated).buffer, existing
        ? {onlyIfMatch: existing.etag} : {onlyIfNew: true});
      if (!result.modified) return errorResponse(409,
        'The shared workspace changed in another session. Refresh and review before saving again.');
      return response;
    } catch {
      // Do not log identities, record content, tokens or database bytes.
      return errorResponse(503, 'Shared storage is unavailable. Saving was not confirmed; refresh and review before retrying.');
    } finally {
      if (db) db.close();
      if (directory) await rm(directory, {recursive: true, force: true});
    }
  };
}
