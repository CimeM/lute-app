import bundledCatalog from '../../books/index.json';
import { db } from '../db/LocalDB';

export const DEFAULT_BOOK_SOURCES = [
  { id: 'built-in', name: 'Built-in books', url: 'builtin', enabled: true },
];

const bundledBookAssets = import.meta.glob('/books/*.md', {
  eager: true,
  query: '?url',
  import: 'default',
});

export async function fetchBookCatalog(source) {
  try {
    let catalog = bundledCatalog;
    if (source.url !== 'builtin') {
      const sourceUrl = new URL(source.url);
      if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
        throw new Error('Catalog URLs must use HTTP or HTTPS.');
      }
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      catalog = await response.json();
    }

    if (!Array.isArray(catalog.books)) throw new Error('Catalog must contain a books array.');
    return { source, books: catalog.books, error: null };
  } catch (error) {
    console.warn(`Could not load book catalog ${source.url}:`, error);
    return { source, books: [], error };
  }
}

export async function importCatalogBook(source, book) {
  try {
    await db.ensureReady();
    const defaultBookPath = source.url === 'builtin' ? `/books/${book.file}` : null;
    const existingBooks = await db.getAllBooks();
    const existing = existingBooks.find((savedBook) => (
      (defaultBookPath && savedBook.defaultBookPath === defaultBookPath)
      || (savedBook.catalogSource === source.url && savedBook.catalogBookId === book.id)
    ));
    if (existing) return existing.id;

    const assetUrl = source.url === 'builtin'
      ? bundledBookAssets[defaultBookPath]
      : new URL(book.file, source.url).toString();
    if (!assetUrl) throw new Error('Book file is missing from the catalog source.');

    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`Book download failed: ${response.status}`);
    const content = await response.text();
    if (!content.trim()) throw new Error('Downloaded book is empty.');

    const savedBook = {
      id: source.url === 'builtin' ? getStableBookId(defaultBookPath) : Date.now(),
      title: book.title,
      author: book.author || '',
      description: book.description || '',
      language: book.language || '',
      content,
      currentPage: 0,
      hasBeenOpened: false,
      addedAt: new Date().toISOString(),
      catalogSource: source.url,
      catalogBookId: book.id,
      ...(defaultBookPath && { defaultBookPath }),
    };
    return await db.saveBook(savedBook);
  } catch (error) {
    console.warn(`Could not add book ${book.id}:`, error);
    throw error;
  }
}

function getStableBookId(sourcePath) {
  let hash = 2166136261;
  for (const character of sourcePath) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return -(Math.abs(hash) + 1);
}