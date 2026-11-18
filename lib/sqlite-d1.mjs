import {DatabaseSync} from 'node:sqlite';

// The small D1 surface used by pilot-api, backed by a real SQLite file.
// This module is Node-only; the original Worker still receives its native D1.
export class SQLiteD1 {
  constructor(filename) {
    this.sqlite = new DatabaseSync(filename);
    this.dirty = false;
  }
  prepare(sql) {
    const db = this;
    return {
      sql, args: [],
      bind(...args) { return {...this, args}; },
      async first() { return db.sqlite.prepare(this.sql).get(...this.args) || null; },
      async all() { return {results: db.sqlite.prepare(this.sql).all(...this.args)}; },
      async run() { return db.execute(this); },
    };
  }
  execute(query) {
    const result = this.sqlite.prepare(query.sql).run(...query.args);
    if (result.changes) this.dirty = true;
    return {success: true, meta: {
      changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid),
    }};
  }
  async batch(queries) {
    const wasDirty = this.dirty;
    this.sqlite.exec('BEGIN');
    try {
      const results = queries.map(query => this.execute(query));
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      this.dirty = wasDirty;
      throw error;
    }
  }
  close() { this.sqlite.close(); }
}
