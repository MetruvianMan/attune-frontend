/**
 * Client-side document text extraction.
 * Supports PDF (.pdf) and Word (.doc, .docx) files.
 */

import mammoth from 'mammoth';
import { extractText } from 'unpdf';

/**
 * Extract text from a File object based on its type.
 * Returns the extracted text, or null if extraction fails.
 */
export async function extractTextFromFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.pdf')) {
      return await extractFromPDF(file);
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      return await extractFromWord(file);
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      return await file.text();
    }
    // Excel and other formats not yet supported
    return null;
  } catch (err) {
    console.warn('Document extraction failed:', err);
    return null;
  }
}

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { text } = await extractText(new Uint8Array(arrayBuffer));
  // text is an array of page strings
  if (Array.isArray(text)) {
    return text.join('\n\n');
  }
  return String(text);
}

async function extractFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
