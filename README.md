# Lute

Lute is a lightweight, local-first Progressive Web App for reading books while learning a language. Choose a book from the library or upload an EPUB, Markdown, or text file. Read offline, tap words to add translations, and mark words by learning level. Books and vocabulary are stored on your device; no account or app server is required.

The app is inspired by [Lute 3](https://github.com/LuteLanguageLearning/lute), the original Learning Using Texts project. Lute brings that reading-and-vocabulary workflow to an installable PWA.

[**Live Demo**](https://lute-app.rivieraapps.com)

---

## Features

- **Local-First:** Books, reading progress, and vocabulary are stored in the local browser database.
- **Book Store:** Browse catalogs, search by title or author, filter by language, and add available books to your library.
- **Mobile-Optimized:** Designed for mobile browsers and installable as a PWA.

## Book Catalogs

Each catalog is an `index.json` file. The bundled catalog is [books/index.json](books/index.json). Add another catalog by entering its index URL under **Settings → Book sources**; the URL must be accessible to the app, including cross-origin access when hosted on another site.

The index contains a `version` and a `books` array. Each book has a stable catalog-unique `id`, display `title`, `author`, short `description`, and language code. Set `file` to a Markdown book path relative to the index file to enable one-tap import. A `purchaseUrl` can link to an external purchase page; it does not handle payment in Lute. Books that are only for purchase can omit `file`.

```json
{
	"version": 1,
	"books": [
		{
			"id": "sample-book-en",
			"title": "Sample Book",
			"author": "A. Author",
			"description": "A short description of the book.",
			"language": "en",
			"file": "sample-book.md",
			"purchaseUrl": "https://example.com/books/sample-book"
		}
	]
}
```

---

## Storage & Browser Compatibility

> [!WARNING]
> **iOS Users:** iOS / Safari can automatically purge local PWA storage after periods of inactivity. This app is primarily tested on Android. Long-term data persistence on iOS is not guaranteed due to WebKit storage policies.

---

## Contributing

Contributions are welcome. Before opening a pull request, test your changes locally and run `pnpm lint` and `pnpm build`. Keep each pull request focused on one feature or fix.

An AI review can help catch issues before submitting. For example, ask:

```text
Review my changes for correctness, consistency with this repository's coding style. Look for the simplest solution that fits the existing code; avoid unnecessary complexity or unrelated changes. Reccomend improvements and hilight risky problems.
```

### Reporting Issues, requesting features
Please use GitHub Issues to report bugs or request features.

### Development

Install dependencies, then start the Vite development server:

```sh
pnpm install
npm run dev
```

## License

MIT

