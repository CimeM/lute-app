export const DB_NAME = 'LutePWA_DB';
export const DB_VERSION = 1;
export const DEFAULT_GITHUB_REPO = 'CimeM/lute-app';

export class LocalDB {
  constructor() {
    this.db = null;
    this.useFallback = false;
    this.memoryBooks = [];
    this.memoryWords = {};
    this.initPromise = null;
  }

  async ensureReady() {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return this.initPromise;
  }

  async init() {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          this.useFallback = true;
          return resolve(this);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('books')) {
            const bookStore = db.createObjectStore('books', { keyPath: 'id' });
            bookStore.createIndex('addedAt', 'addedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('words')) {
            const wordStore = db.createObjectStore('words', { keyPath: 'text' });
            wordStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this);
        };

        request.onerror = (e) => {
          console.warn("IndexedDB access blocked. Falling back.", e?.target?.error);
          this.useFallback = true;
          resolve(this);
        };
      } catch (err) {
        console.warn("IndexedDB initialization exception:", err);
        this.useFallback = true;
        resolve(this);
      }
    });
  }

  // --- BOOKS ---
  async getAllBooks() {
    await this.ensureReady();
    if (this.useFallback || !this.db) return this.fallbackGetAllBooks();

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('books', 'readonly');
        const req = tx.objectStore('books').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.fallbackGetAllBooks());
      } catch (e) {
        resolve(this.fallbackGetAllBooks());
      }
    });
  }

  async getBook(id) {
    await this.ensureReady();
    if (this.useFallback || !this.db) {
      const books = this.fallbackGetAllBooks();
      return books.find(b => Number(b.id) === Number(id)) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('books', 'readonly');
        const req = tx.objectStore('books').get(Number(id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async saveBook(book) {
    await this.ensureReady();
    if (!book.id) book.id = Date.now();

    if (this.useFallback || !this.db) {
      this.fallbackSaveBook(book);
      return book.id;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('books', 'readwrite');
        const req = tx.objectStore('books').put(book);
        req.onsuccess = () => resolve(book.id);
        req.onerror = () => {
          this.fallbackSaveBook(book);
          resolve(book.id);
        };
      } catch (e) {
        this.fallbackSaveBook(book);
        resolve(book.id);
      }
    });
  }

  async deleteBook(id) {
    await this.ensureReady();
    if (this.useFallback || !this.db) {
      this.fallbackDeleteBook(id);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('books', 'readwrite');
        const req = tx.objectStore('books').delete(Number(id));
        req.onsuccess = () => {
          this.fallbackDeleteBook(id);
          resolve();
        };
        req.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  fallbackGetAllBooks() {
    try {
      const index = JSON.parse(localStorage.getItem('lute_book_index') || '[]');
      const books = [];
      for (const id of index) {
        const item = localStorage.getItem(`lute_book_${id}`);
        if (item) books.push(JSON.parse(item));
      }
      return books.length > 0 ? books : this.memoryBooks;
    } catch(e) {
      return this.memoryBooks;
    }
  }

  fallbackSaveBook(book) {
    const idx = this.memoryBooks.findIndex(b => b.id === book.id);
    if (idx >= 0) this.memoryBooks[idx] = book;
    else this.memoryBooks.push(book);

    try {
      const index = JSON.parse(localStorage.getItem('lute_book_index') || '[]');
      if (!index.includes(book.id)) index.push(book.id);
      localStorage.setItem('lute_book_index', JSON.stringify(index));
      localStorage.setItem(`lute_book_${book.id}`, JSON.stringify(book));
    } catch(e) {}
  }

  fallbackDeleteBook(id) {
    this.memoryBooks = this.memoryBooks.filter(b => b.id !== Number(id));
    try {
      let index = JSON.parse(localStorage.getItem('lute_book_index') || '[]');
      index = index.filter(i => Number(i) !== Number(id));
      localStorage.setItem('lute_book_index', JSON.stringify(index));
      localStorage.removeItem(`lute_book_${id}`);
    } catch(e) {}
  }

  // --- WORDS ---
  async getAllWords() {
    await this.ensureReady();
    if (this.useFallback || !this.db) {
      try { return JSON.parse(localStorage.getItem('lute_words') || '{}'); } catch(e) { return this.memoryWords; }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('words', 'readonly');
        const req = tx.objectStore('words').getAll();
        req.onsuccess = () => {
          const map = {};
          (req.result || []).forEach(w => map[w.text] = w);
          resolve(map);
        };
        req.onerror = () => resolve({});
      } catch (e) {
        resolve({});
      }
    });
  }

  async saveWord(wordObj) {
    await this.ensureReady();
    this.memoryWords[wordObj.text] = wordObj;
    try {
      const words = JSON.parse(localStorage.getItem('lute_words') || '{}');
      words[wordObj.text] = wordObj;
      localStorage.setItem('lute_words', JSON.stringify(words));
    } catch(e) {}

    if (this.useFallback || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('words', 'readwrite');
        const req = tx.objectStore('words').put(wordObj);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  // --- SETTINGS ---
  async getSettings() {
    await this.ensureReady();
    const defaultSettings = {
      key: 'user_config',
      username: '',
      readerTheme: 'system',
      githubRepo: DEFAULT_GITHUB_REPO,
      enableSync: false,
      isLoggedIn: false,
      syncApiUrl: 'https://api.example.com/lute/sync'
    };

    try {
      const saved = localStorage.getItem('lute_settings');
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch(e) {}

    if (this.useFallback || !this.db) return defaultSettings;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('user_config');
        req.onsuccess = () => resolve(req.result ? { ...defaultSettings, ...req.result } : defaultSettings);
        req.onerror = () => resolve(defaultSettings);
      } catch (e) {
        resolve(defaultSettings);
      }
    });
  }

  async saveSettings(settings) {
    await this.ensureReady();
    try { localStorage.setItem('lute_settings', JSON.stringify(settings)); } catch(e) {}
    if (this.useFallback || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('settings', 'readwrite');
        const req = tx.objectStore('settings').put({ key: 'user_config', ...settings });
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
}

export const db = new LocalDB();