export const chunkTextIntoPages = (fullText, wordsPerPage) => {
  if (!fullText) return [];
  const tokens = fullText.match(/[\w\u00C0-\u024F]+|[^\w\u00C0-\u024F]+/g) || [];
  
  const pages = [];
  let currentChunk = [];
  let wordCounter = 0;

  for (let token of tokens) {
    currentChunk.push(token);
    if (/[\w\u00C0-\u024F]/.test(token)) {
      wordCounter++;
    }

    if (wordCounter >= wordsPerPage) {
      pages.push(currentChunk.join(''));
      currentChunk = [];
      wordCounter = 0;
    }
  }

  if (currentChunk.length > 0) {
    pages.push(currentChunk.join(''));
  }

  return pages;
};