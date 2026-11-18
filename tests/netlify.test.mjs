import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createNetlifyHandler} from '../lib/netlify-pilot.mjs';
import {STEPS, localDate} from '../public/domain.mjs';

const OWNER = {id: 'netlify-owner', email: 'owner@example.invalid', expiresAt: new Date('2099-01-01')};
const CONTEXT = {user: OWNER, deploy: {id: 'production-deploy', context: 'production'}};
class MemoryBlobs {
  entries = new Map(); reads = []; writes = []; generation = 0; unavailable = false;
  getStore = options => {
    assert.equal(options.consistency, 'strong');
    const prefix = options.name;
    return {
      getWithMetadata: async (key, config) => {
        assert.equal(config.type, 'arrayBuffer');
        this.reads.push(prefix);
        if (this.unavailable) throw new Error('Storage unavailable');
        const entry = this.entries.get(prefix + '/' + key);
        return entry ? {data: entry.data.slice(0), etag: entry.etag} : null;
      },
      set: async (key, data, conditions) => {
        this.writes.push(conditions);
        if (this.failWrites) throw new Error('Write unavailable');
        const address = prefix + '/' + key, previous = this.entries.get(address);
        if (conditions.onlyIfNew && previous) return {modified: false};
        if (conditions.onlyIfMatch && previous?.etag !== conditions.onlyIfMatch) return {modified: false};
        assert.ok(conditions.onlyIfNew || conditions.onlyIfMatch, 'Unconditional writes are forbidden');
        const etag = String(++this.generation);
        this.entries.set(address, {data: data.slice(0), etag});
        return {modified: true, etag};
      },
    };
  };
}
async function setup(t, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'trialflow-tests-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const filename = join(root, 'base.sqlite');
  const db = new DatabaseSync(filename);
  db.exec(await readFile(new URL('../drizzle/0000_peaceful_grim_reaper.sql', import.meta.url), 'utf8'));
  db.close();
  const baseSnapshot = (await readFile(filename)).toString('base64');
  const store = new MemoryBlobs();
  const handler = createNetlifyHandler({getStore: store.getStore, baseSnapshot,
    ownerEmail: OWNER.email, temporaryRoot: root, ...overrides});
  const call = async (path, body, context = CONTEXT, extraHeaders = {}) => {
    const request = new Request('https://trialflow.test/api/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {...(body === undefined ? {} : {
        'Content-Type': 'application/json', Origin: 'https://trialflow.test', 'X-Trialflow-Request': '1',
      }), ...extraHeaders}, ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    const response = await handler(request, context);
    return {status: response.status, body: await response.json()};
  };
  const assertClean = async () => assert.deepEqual(await readdir(root), ['base.sqlite']);
  const snapshot = async () => {
    const value = store.entries.get('trialflow-production-v1/workspace-v1.sqlite');
    const file = join(root, 'inspect.sqlite');
    await writeFile(file, Buffer.from(value.data));
    const sqlite = new DatabaseSync(file);
    try { return {
      audit: sqlite.prepare('SELECT action,actor_id FROM audit ORDER BY seq').all(),
      members: sqlite.prepare('SELECT auth_id,email FROM members').all(),
    }; } finally {sqlite.close(); await rm(file);}
  };
  return {root, store, handler, call, assertClean, snapshot};
}

test('Netlify rejects missing or expired verified context, including spoofed identity headers and training', async t => {
  const x = await setup(t);
  for (const path of ['session', 'workspace', 'training']) {
    assert.equal((await x.call(path, undefined, {}, {
      'oai-authenticated-user-id': OWNER.id, 'oai-authenticated-user-email': OWNER.email,
    })).status, 401);
  }
  assert.equal((await x.call('session', undefined, {...CONTEXT, user: {...OWNER, email: undefined}})).status, 401);
  assert.equal((await x.call('session', undefined, {...CONTEXT, user: {...OWNER, expiresAt: new Date(0)}})).status, 401);
  assert.equal(x.store.reads.length, 0);
  await x.assertClean();
});

test('Netlify maps only verified platform identity and requires owner/deploy configuration', async t => {
  const x = await setup(t);
  const visitor = {...CONTEXT, user: {...OWNER, id: 'visitor', email: 'visitor@example.invalid'}};
  assert.equal((await x.call('session', undefined, visitor, {
    'oai-authenticated-user-id': OWNER.id, 'oai-authenticated-user-email': OWNER.email,
  })).status, 403);
  assert.equal(x.store.entries.size, 0);
  const result = await x.call('session', undefined, CONTEXT, {
    'oai-authenticated-user-id': 'forged', 'oai-authenticated-user-email': 'forged@example.invalid',
  });
  assert.equal(result.status, 200);
  assert.equal((await x.snapshot()).members[0].auth_id, 'netlify:' + OWNER.id);
  assert.equal((await x.snapshot()).members[0].email, OWNER.email);
  assert.equal((await x.call('session', undefined, {user: OWNER})).status, 503);
  const unconfigured = await setup(t, {ownerEmail: ''});
  assert.equal((await unconfigured.call('session')).status, 503);
  await x.assertClean();
});

test('Netlify persists task checks, dashboard completion, source flags and audit across invocations', async t => {
  const x = await setup(t);
  assert.equal((await x.call('initialize', {syntheticAcknowledged: true})).status, 201);
  let current = (await x.call('workspace')).body;
  const created = await x.call('records', {version: current.version, syntheticAcknowledged: true,
    record: {studyId: current.workspace.studies[0].id, type: 'saes', title: 'Synthetic safety follow-up', dueDate: localDate(), impact: 3}});
  assert.equal(created.status, 201);
  const record = created.body.workspace.records.at(-1), source = record.source;
  for (let i = 0; i < STEPS.saes.length; i++) {
    current = (await x.call('workspace')).body;
    assert.equal((await x.call('workflow', {version: current.version, id: record.id,
      action: 'complete', reason: 'SYN-REF-' + i})).status, 200);
  }
  current = (await x.call('workspace')).body;
  const saved = current.workspace.records.find(value => value.id === record.id);
  assert.equal(saved.steps.length, STEPS.saes.length);
  assert.deepEqual(saved.source, source);
  assert.equal(saved.source.flagged, true);
  const evidence = await x.snapshot();
  assert.equal(evidence.audit.filter(row => row.action.startsWith('workflow.')).length, STEPS.saes.length);
  const actor = (await x.call('session')).body.member.id;
  assert.ok(evidence.audit.every(row => row.actor_id === actor));
  const writes = x.store.writes.length;
  await x.call('workspace'); await x.call('audit');
  assert.equal(x.store.writes.length, writes, 'Pure reads must not rewrite storage');
  await x.assertClean();
});

test('Netlify conditional creation and updates reject races without persisting losing audit records', async t => {
  const x = await setup(t);
  const first = await Promise.all([x.call('session'), x.call('session')]);
  assert.deepEqual(first.map(result => result.status).sort(), [200, 409]);
  assert.ok(x.store.writes.every(value => value.onlyIfNew === true));
  await x.call('initialize', {syntheticAcknowledged: true});
  const current = (await x.call('workspace')).body;
  const writes = await Promise.all([1, 2].map(capacity => x.call('settings', {
    version: current.version, settings: {...current.workspace.settings, capacity}, reason: 'Concurrent test',
  })));
  assert.deepEqual(writes.map(result => result.status).sort(), [200, 409]);
  assert.equal((await x.call('workspace')).body.version, current.version + 1);
  assert.equal((await x.snapshot()).audit.filter(row => row.action === 'settings.update').length, 1);
  await x.assertClean();
});

test('Netlify storage failure and size limit never report a successful save', async t => {
  const x = await setup(t);
  x.store.unavailable = true;
  assert.equal((await x.call('session')).status, 503);
  x.store.unavailable = false;
  await x.call('initialize', {syntheticAcknowledged: true});
  const current = (await x.call('workspace')).body;
  x.store.failWrites = true;
  const failed = await x.call('settings', {version: current.version,
    settings: {...current.workspace.settings, capacity: 2}, reason: 'Failure injection'});
  assert.equal(failed.status, 503);
  x.store.failWrites = false;
  assert.equal((await x.call('workspace')).body.version, current.version);
  assert.equal((await x.snapshot()).audit.filter(row => row.action === 'settings.update').length, 0);
  const capped = await setup(t, {maxSnapshotBytes: 1});
  assert.equal((await capped.call('session')).status, 507);
  assert.equal(capped.store.entries.size, 0);
  await x.assertClean(); await capped.assertClean();
});

test('Netlify previews have isolated storage and retain same-origin mutation protection', async t => {
  const x = await setup(t);
  await x.call('initialize', {syntheticAcknowledged: true});
  const preview = {...CONTEXT, deploy: {id: 'preview-one', context: 'deploy-preview'}};
  assert.equal((await x.call('session', undefined, preview)).body.initialized, false);
  assert.equal(x.store.entries.size, 2);
  assert.equal((await x.call('session')).body.initialized, true);
  const current = (await x.call('workspace')).body;
  assert.equal((await x.call('settings', {version: current.version,
    settings: current.workspace.settings, reason: 'Cross-origin'}, CONTEXT, {Origin: 'https://other.test'})).status, 403);
  await x.assertClean();
});
