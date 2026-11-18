import {DatabaseSync} from 'node:sqlite';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {html} from '../lib/html.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '.netlify/trialflow');
const publish = join(output, 'public');
await rm(output, {recursive: true, force: true});
await mkdir(publish, {recursive: true});

// Explicit allowlist: source, credentials, schema and database stay unpublished.
for (const name of ['domain.mjs', 'trialflow.mjs', 'trialflow.css', 'fonts.css', 'favicon.svg']) {
  await copyFile(join(root, 'public', name), join(publish, name));
}
await writeFile(join(publish, 'index.html'), html);
await writeFile(join(publish, 'hosting.mjs'), `export const AUTH = ${JSON.stringify({
  signInPath: '/', signInLabel: 'Reopen private workspace',
  accountPath: 'https://app.netlify.com/', accountLabel: 'Netlify account ↗',
  switchPath: 'https://app.netlify.com/', switchLabel: 'Open Netlify account',
})};\n`);

// Build schema only, once. No request-time migration or bundled user records.
const temporary = await mkdtemp(join(tmpdir(), 'trialflow-schema-'));
let db;
try {
  const filename = join(temporary, 'schema.sqlite');
  db = new DatabaseSync(filename);
  const migrations = (await readdir(join(root, 'drizzle'))).filter(name => name.endsWith('.sql')).sort();
  for (const name of migrations) db.exec(await readFile(join(root, 'drizzle', name), 'utf8'));
  for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    if (db.prepare(`SELECT count(*) AS n FROM "${name.replaceAll('"', '""')}"`).get().n) {
      throw new Error('Netlify schema template must contain no records');
    }
  }
  db.close(); db = null;
  const bytes = await readFile(filename);
  await writeFile(join(output, 'base-snapshot.mjs'), `export const baseSnapshot = '${bytes.toString('base64')}';\n`);
} finally {
  if (db) db.close();
  await rm(temporary, {recursive: true, force: true});
}
console.log('Netlify frontend and empty private database template built.');
