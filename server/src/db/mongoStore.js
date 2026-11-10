// MongoDB store using Mongoose. Exposes the same small interface as the file
// store, mapping Mongo's `_id` to `id` so services stay storage-agnostic.
import mongoose from 'mongoose';
import { schemas } from './models.js';

const toDoc = (d) => {
  if (!d) return null;
  const { _id, ...rest } = d;
  return { id: _id, ...rest };
};

const mapFilter = (filter = {}) => {
  const out = {};
  for (const [k, v] of Object.entries(filter)) out[k === 'id' ? '_id' : k] = v;
  return out;
};

export async function createMongoStore(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const models = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, mongoose.models[name] || mongoose.model(name, schema, name)]),
  );

  const collection = (name) => {
    const M = models[name];
    return {
      async find(filter = {}, { sort, limit } = {}) {
        let q = M.find(mapFilter(filter)).lean();
        if (sort) q = q.sort(sort);
        if (limit) q = q.limit(limit);
        return (await q).map(toDoc);
      },
      async findOne(filter = {}) {
        return toDoc(await M.findOne(mapFilter(filter)).lean());
      },
      async findById(id) {
        return toDoc(await M.findById(id).lean());
      },
      async count(filter = {}) {
        return M.countDocuments(mapFilter(filter));
      },
      async insert(doc) {
        const { id, ...rest } = doc;
        const created = await M.create({ _id: id, ...rest });
        return toDoc(created.toObject());
      },
      async insertMany(docs) {
        await M.insertMany(docs.map(({ id, ...rest }) => ({ _id: id, ...rest })));
      },
      async update(id, patch) {
        return toDoc(await M.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean());
      },
      async updateWhere(id, filter, patch) {
        return toDoc(await M.findOneAndUpdate({ _id: id, ...mapFilter(filter) }, { $set: patch }, { new: true }).lean());
      },
      async remove(id) {
        await M.deleteOne({ _id: id });
      },
      async clear() {
        await M.deleteMany({});
      },
    };
  };

  return { mode: 'mongodb', collection, async flush() {} };
}
