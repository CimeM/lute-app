import JSZip from 'jszip';

export const parseEPUBFile = async (file) => {
  const zip = await JSZip.loadAsync(file);
  let textContent = "";
  
  const htmlFiles = Object.keys(zip.files).filter(fileName => 
    /\.(html|xhtml|htm)$/i.test(fileName)
  );

  for (const fileName of htmlFiles) {
    const rawHtml = await zip.file(fileName).async("string");
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script, style').forEach(el => el.remove());
    const bodyText = doc.body ? doc.body.textContent : doc.documentElement.textContent;
    if (bodyText.trim().length > 0) {
      textContent += bodyText + "\n\n";
    }
  }
  return textContent.replace(/\s+/g, ' ').trim();
};