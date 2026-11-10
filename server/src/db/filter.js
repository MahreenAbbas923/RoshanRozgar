// Tiny query matcher shared by the file store. Supports equality,
// { $in: [...] }, { $ne: value } and { $nin: [...] } on top-level fields.
export function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    const value = doc[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      if ('$in' in cond) return cond.$in.some((c) => equals(value, c));
      if ('$nin' in cond) return !cond.$nin.some((c) => equals(value, c));
      if ('$ne' in cond) return !equals(value, cond.$ne);
    }
    return equals(value, cond);
  });
}

function equals(value, cond) {
  if (Array.isArray(value) && !Array.isArray(cond)) return value.includes(cond);
  if (value instanceof Date || cond instanceof Date) return new Date(value).getTime() === new Date(cond).getTime();
  return (value ?? null) === (cond ?? null);
}

export function sortDocs(docs, sort) {
  if (!sort) return docs;
  const [[field, dir]] = Object.entries(sort);
  return [...docs].sort((a, b) => {
    const av = a[field] instanceof Date || typeof a[field] === 'string' ? new Date(a[field]).getTime() || a[field] : a[field];
    const bv = b[field] instanceof Date || typeof b[field] === 'string' ? new Date(b[field]).getTime() || b[field] : b[field];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * dir;
  });
}
