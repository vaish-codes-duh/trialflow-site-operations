import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
// Real SQLite, wrapped with the D1 calls used by the application. No auth bypass
// exists in the application: test identities are supplied only to test Requests.
export class TestD1{
 constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec(readFileSync(new URL('../drizzle/0000_peaceful_grim_reaper.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this;return {sql,args:[],bind(...args){return {...this,args};},async first(){return db.sqlite.prepare(this.sql).get(...this.args)||null;},async all(){return {results:db.sqlite.prepare(this.sql).all(...this.args)};},async run(){return db.execute(this);}};}
 execute(q){const r=this.sqlite.prepare(q.sql).run(...q.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
 async batch(queries){this.sqlite.exec('BEGIN');try{const results=queries.map(q=>this.execute(q));this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
 close(){this.sqlite.close();}
}
