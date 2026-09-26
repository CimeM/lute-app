const bundledBookAssets = import.meta.glob('/books/*.md', {
  eager: true,
  query: '?url',
  import: 'default',
});

const importedBooksKey = 'lute_imported_default_books';

function getImportedSources() {
  try {
    return new Set(JSON.parse(localStorage.getItem(importedBooksKey) || '[]'));
  } catch {
    return new Set();
  }
}

function saveImportedSources(sources) {
  try {
    localStorage.setItem(importedBooksKey, JSON.stringify([...sources]));
  } catch {
    // IndexedDB still prevents duplicate imports when local storage is unavailable.
  }
}

function getBookTitle(content, sourcePath) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;

  const filename = sourcePath.split('/').pop();
  return filename.replace(/\.md$/i, '').replace(/[_-]+/g, ' ');
}

export async function seedDefaultBooks(db) {
  const importedSources = getImportedSources();
  const existingBooks = await db.getAllBooks();
  const existingSources = new Set(existingBooks.map((book) => book.defaultBookPath).filter(Boolean));
  const entries = Object.entries(bundledBookAssets).sort(([a], [b]) => a.localeCompare(b));
  const idBase = Date.now();

  for (const [index, [sourcePath, assetUrl]] of entries.entries()) {
    if (importedSources.has(sourcePath)) continue;

    if (existingSources.has(sourcePath)) {
      importedSources.add(sourcePath);
      saveImportedSources(importedSources);
      continue;
    }

    try {
      const response = await fetch(assetUrl);
      if (!response.ok) throw new Error(`Unable to fetch ${sourcePath}: ${response.status}`);

      const content = await response.text();
      if (!content.trim()) continue;

      await db.saveBook({
        id: -(idBase + index),
        title: getBookTitle(content, sourcePath),
        content,
        currentPage: 0,
        addedAt: new Date().toISOString(),
        defaultBookPath: sourcePath,
      });

      importedSources.add(sourcePath);
      existingSources.add(sourcePath);
      saveImportedSources(importedSources);
    } catch (error) {
      console.warn(`Could not add default book ${sourcePath}:`, error);
    }
  }
}