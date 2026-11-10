// Demo-mode store: keeps all collections in memory and persists them to a JSON
// file, so the app works fully without a MongoDB server.
import fs from 'node:fs';
import path from 'node:path';
import { matches, sortDocs } from './filter.js';
import { COLLECTIONS } from './models.js';

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function createFileStore(filePath) {
  let data = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  if (fs.existsSync(filePath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data = { ...data, ...loaded };
    } catch (err) {
      console.error('[fileStore] Could not read demo database, starting empty:', err.message);
    }
  }

  let timer = null;
  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, filePath);
    }, 80);
  };

  const collection = (name) => {
    const rows = () => data[name];
    return {
      async find(filter = {}, { sort, limit } = {}) {
        let out = rows().filter((d) => matches(d, filter));
        out = sortDocs(out, sort);
        if (limit) out = out.slice(0, limit);
        return clone(out);
      },
      async findOne(filter = {}) {
        return clone(rows().find((d) => matches(d, filter)) || null);
      },
      async findById(id) {
        return clone(rows().find((d) => d.id === id) || null);
      },
      async count(filter = {}) {
        return rows().filter((d) => matches(d, filter)).length;
      },
      async insert(doc) {
        const row = clone(doc);
        rows().push(row);
        persist();
        return clone(row);
      },
      async insertMany(docs) {
        rows().push(...clone(docs));
        persist();
      },
      async update(id, patch) {
        const row = rows().find((d) => d.id === id);
        if (!row) return null;
        Object.assign(row, clone(patch));
        persist();
        return clone(row);
      },
      // Atomic conditional update: applies patch only if the row still matches `filter`.
      async updateWhere(id, filter, patch) {
        const row = rows().find((d) => d.id === id && matches(d, filter));
        if (!row) return null;
        Object.assign(row, clone(patch));
        persist();
        return clone(row);
      },
      async remove(id) {
        data[name] = rows().filter((d) => d.id !== id);
        persist();
      },
      async clear() {
        data[name] = [];
        persist();
      },
    };
  };

  return {
    mode: 'demo-file',
    collection,
    async flush() {
      clearTimeout(timer);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data));
    },
  };
}
