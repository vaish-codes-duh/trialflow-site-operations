import {readFileSync} from 'node:fs';
import {SQLiteD1} from '../lib/sqlite-d1.mjs';
// The same real SQLite adapter used in the Netlify function.
export class TestD1 extends SQLiteD1 {
 constructor(){super(':memory:');this.sqlite.exec(readFileSync(new URL('../drizzle/0000_peaceful_grim_reaper.sql',import.meta.url),'utf8'));}
}
