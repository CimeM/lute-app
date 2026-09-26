import JSZip from "jszip";

/**
 * Standalone EPUB Parser for Lute Light Reader
 * Parses EPUB2 / EPUB3 containers using JSZip and DOMParser.
 */

/**
 * Extracts and concatenates text from an EPUB file sequentially via its spine manifest.
 * @param {File|Blob|ArrayBuffer} file - The EPUB file to parse.
 * @returns {Promise<string>} The extracted text content from all spine documents.
 */
export async function parseEPUBFile(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate rootfile path inside META-INF/container.xml
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("Invalid EPUB file: META-INF/container.xml not found.");
  }

  const containerXml = await containerFile.async("string");
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "text/xml");
  const rootfileEl = containerDoc.querySelector("rootfile");

  if (!rootfileEl) {
    throw new Error("Invalid EPUB: Rootfile entry missing from container.xml.");
  }

  const opfPath = rootfileEl.getAttribute("full-path");
  const opfFile = zip.file(opfPath);

  if (!opfFile) {
    throw new Error(`OPF package file not found at ${opfPath}`);
  }

  // Base folder path inside zip where OPF resides
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  // 2. Parse OPF XML to resolve Manifest and Spine reading order
  const opfXml = await opfFile.async("string");
  const opfDoc = parser.parseFromString(opfXml, "text/xml");

  const manifestItems = {};
  opfDoc.querySelectorAll("manifest > item").forEach((item) => {
    manifestItems[item.getAttribute("id")] = item.getAttribute("href");
  });

  const itemrefs = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  let fullText = "";

  // 3. Process spine items sequentially
  for (const itemref of itemrefs) {
    const idref = itemref.getAttribute("idref");
    const relativeHref = manifestItems[idref];

    if (!relativeHref) continue;

    // Resolve path relative to opf directory
    const hrefPath = (opfDir + relativeHref).replace(/^\//, "");

    // Find key inside ZIP (accounting for URL decoding)
    const zipKey = Object.keys(zip.files).find(
      (key) => key === hrefPath || key === decodeURIComponent(hrefPath)
    );

    if (zipKey && zip.file(zipKey)) {
      const rawHtml = await zip.file(zipKey).async("string");
      const htmlDoc = parser.parseFromString(rawHtml, "text/html");

      // Clean out scripts, styles, and non-readable elements
      htmlDoc.querySelectorAll("script, style, head").forEach((el) => el.remove());
      const bodyText = htmlDoc.body ? htmlDoc.body.textContent : htmlDoc.documentElement.textContent;

      if (bodyText && bodyText.trim().length > 0) {
        fullText += bodyText.trim() + "\n\n";
      }
    }
  }

  // Normalize whitespace and blank lines
  const cleanedText = fullText.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();

  if (!cleanedText) {
    throw new Error("No readable text content extracted from EPUB spine.");
  }

  return cleanedText;
}

/**
 * Utility helper to chunk raw text into pages by word count.
 * @param {string} fullText - The entire book text.
 * @param {number} wordsPerPage - Target words per page.
 * @returns {string[]} Array of page text strings.
 */
export function chunkTextIntoPages(fullText, wordsPerPage = 120) {
  if (!fullText) return [];
  const tokens = fullText.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) || [];

  const pages = [];
  let currentChunk = [];
  let wordCounter = 0;

  for (const token of tokens) {
    currentChunk.push(token);
    if (/[\p{L}\p{M}\p{N}]/u.test(token)) {
      wordCounter++;
    }

    if (wordCounter >= wordsPerPage) {
      pages.push(currentChunk.join(""));
      currentChunk = [];
      wordCounter = 0;
    }
  }

  if (currentChunk.length > 0) {
    pages.push(currentChunk.join(""));
  }

  return pages;
}

export async function chunkTextIntoPagesAsync(fullText, wordsPerPage = 300, onProgress = () => {}) {
  if (!fullText) return [];

  const pages = [];
  let currentChunk = [];
  let wordCounter = 0;
  let tokenCount = 0;
  const tokens = /[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu;
  let match;

  while ((match = tokens.exec(fullText)) !== null) {
    const token = match[0];
    currentChunk.push(token);
    if (/[\p{L}\p{M}\p{N}]/u.test(token)) wordCounter++;

    if (wordCounter >= wordsPerPage) {
      pages.push(currentChunk.join(""));
      currentChunk = [];
      wordCounter = 0;
    }

    tokenCount++;
    if (tokenCount % 10000 === 0) {
      onProgress(Math.min(99, Math.round((tokens.lastIndex / fullText.length) * 100)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (currentChunk.length > 0) pages.push(currentChunk.join(""));
  onProgress(100);
  return pages;
}