import { GlossaryTerm, GlossaryCategory } from '../models/glossary';

export interface TermMatch {
  term: GlossaryTerm;
  position: number;
  length: number;
}

export interface GlossaryServiceInterface {
  getTerms(category?: GlossaryCategory): GlossaryTerm[];
  getTerm(term: string): GlossaryTerm | null;
  findTermsInText(text: string): TermMatch[];
}

export class GlossaryService implements GlossaryServiceInterface {
  private terms: GlossaryTerm[];

  constructor(terms: GlossaryTerm[]) {
    this.terms = terms;
  }

  getTerms(category?: GlossaryCategory): GlossaryTerm[] {
    if (category === undefined) {
      return [...this.terms];
    }
    return this.terms.filter((t) => t.category === category);
  }

  getTerm(term: string): GlossaryTerm | null {
    const lower = term.toLowerCase();
    return this.terms.find((t) => t.term.toLowerCase() === lower) ?? null;
  }

  findTermsInText(text: string): TermMatch[] {
    const matches: TermMatch[] = [];
    const lowerText = text.toLowerCase();

    for (const entry of this.terms) {
      const lowerTerm = entry.term.toLowerCase();
      let startIndex = 0;

      while (startIndex < lowerText.length) {
        const pos = lowerText.indexOf(lowerTerm, startIndex);
        if (pos === -1) break;

        // Whole-word boundary check
        const charBefore = pos > 0 ? lowerText[pos - 1] : ' ';
        const charAfter =
          pos + lowerTerm.length < lowerText.length
            ? lowerText[pos + lowerTerm.length]
            : ' ';

        if (isWordBoundary(charBefore) && isWordBoundary(charAfter)) {
          matches.push({
            term: entry,
            position: pos,
            length: entry.term.length,
          });
        }

        startIndex = pos + 1;
      }
    }

    // Sort by position for consistent ordering
    matches.sort((a, b) => a.position - b.position);
    return matches;
  }
}

function isWordBoundary(char: string): boolean {
  return !/[a-zA-Z0-9]/.test(char);
}
