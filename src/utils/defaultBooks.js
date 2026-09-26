const bundledBookAssets = import.meta.glob('/books/*.md', {
  eager: true,
  query: '?url',
  import: 'default',
});

const importedBooksKey = 'lute_imported_default_books';
const renamedBookPaths = {
  '/books/🇷🇸_avantura_malog_zmaja.md': '/books/avantura_malog_zmaja.md',
  '/books/🇷🇺_code_artifact.md': '/books/code_artifact.md',
  '/books/🇩🇪_das_abenteuer_des_kleinen_drachen.md': '/books/das_abenteuer_des_kleinen_drachen.md',
  '/books/🇸🇰_dobrodru_stvo_mal_ho_draka.md': '/books/dobrodru_stvo_mal_ho_draka.md',
  '/books/🇸🇮_dogodiv_ina_malega_zmaja.md': '/books/dogodiv_ina_malega_zmaja.md',
  '/books/🇳🇱_het_avontuur_van_de_kleine_draak.md': '/books/het_avontuur_van_de_kleine_draak.md',
  '/books/🇫🇷_l_aventure_du_petit_dragon.md': '/books/l_aventure_du_petit_dragon.md',
  '/books/🇮🇹_l_avventura_del_piccolo_drago.md': '/books/l_avventura_del_piccolo_drago.md',
  '/books/🇪🇸_la_aventura_del_peque_o_drag_n.md': '/books/la_aventura_del_peque_o_drag_n.md',
  '/books/🇭🇷_pustolovina_malog_zmaja.md': '/books/pustolovina_malog_zmaja.md',
};

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

function getStableBookId(sourcePath) {
  let hash = 2166136261;
  for (const character of sourcePath) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return -(Math.abs(hash) + 1);
}

export async function seedDefaultBooks(db) {
  const importedSources = getImportedSources();
  const existingBooks = await db.getAllBooks();
  const existingSources = new Set(existingBooks.map((book) => book.defaultBookPath).filter(Boolean));
  const entries = Object.entries(bundledBookAssets).sort(([a], [b]) => a.localeCompare(b));
  for (const [sourcePath, assetUrl] of entries) {
    if (importedSources.has(sourcePath)) continue;

    const previousPath = renamedBookPaths[sourcePath];
    const previousBook = existingBooks.find((book) => book.defaultBookPath === previousPath);
    if (previousBook) {
      previousBook.defaultBookPath = sourcePath;
      await db.saveBook(previousBook);
      existingSources.delete(previousPath);
      existingSources.add(sourcePath);
      importedSources.delete(previousPath);
      importedSources.add(sourcePath);
      saveImportedSources(importedSources);
      continue;
    }

    if (previousPath && importedSources.has(previousPath)) {
      importedSources.delete(previousPath);
      importedSources.add(sourcePath);
      saveImportedSources(importedSources);
      continue;
    }

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
        id: getStableBookId(sourcePath),
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