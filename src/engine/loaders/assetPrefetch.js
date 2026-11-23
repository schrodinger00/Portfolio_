const prefetchCache = new Map();

async function fetchGlbWithProgress(url, entry) {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Failed to fetch GLB (${response.status}): ${url}`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  if (!response.body || totalBytes <= 0) {
    const buffer = await response.arrayBuffer();
    entry.latestPct = 100;
    entry.listeners.forEach((cb) => cb(100));
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    const pct = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
    if (pct !== entry.latestPct) {
      entry.latestPct = pct;
      entry.listeners.forEach((cb) => cb(pct));
    }
  }

  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }

  if (entry.latestPct < 100) {
    entry.latestPct = 100;
    entry.listeners.forEach((cb) => cb(100));
  }

  return merged.buffer;
}

export function prefetchGlbUrl(url) {
  if (!url || typeof window === 'undefined' || prefetchCache.has(url)) return;

  const entry = {
    latestPct: 0,
    listeners: new Set(),
    promise: null,
  };

  entry.promise = fetchGlbWithProgress(url, entry).catch((err) => {
    prefetchCache.delete(url);
    throw err;
  });

  prefetchCache.set(url, entry);
}

export function prefetchDefaultGlbs(defaultModels) {
  if (!defaultModels) return;
  if (defaultModels.handsUrl) prefetchGlbUrl(defaultModels.handsUrl);
  if (defaultModels.eyeUrl) prefetchGlbUrl(defaultModels.eyeUrl);
}

export async function consumePrefetchedGlb(url, onProgress) {
  const entry = prefetchCache.get(url);
  if (!entry) return null;

  if (onProgress) {
    if (entry.latestPct > 0) onProgress(entry.latestPct);
    entry.listeners.add(onProgress);
  }

  try {
    const buffer = await entry.promise;
    // Defer cache eviction briefly so React StrictMode remounts reuse the same buffer without re-fetching
    if (!entry.evictTimer) {
      entry.evictTimer = window.setTimeout(() => {
        prefetchCache.delete(url);
      }, 15000);
    }
    const result = entry.hasConsumed ? buffer.slice(0) : buffer;
    entry.hasConsumed = true;
    return result;
  } finally {
    if (onProgress) {
      entry.listeners.delete(onProgress);
    }
  }
}
