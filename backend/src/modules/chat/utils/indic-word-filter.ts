export class IndicWordFilter {
  private prohibitedSet: Set<string>;

  constructor(prohibitedWords: string[]) {
    this.prohibitedSet = new Set(prohibitedWords.map((w) => this.normalizeIndic(w)));
  }

  /**
   * Normalizes Indic text using Unicode NFKC.
   * Crucial: DOES NOT strip combining marks in Indic range (\u0900-\u097F)
   * so Devanagari matras (vowels) and virama remain completely intact.
   */
  public normalizeIndic(text: string): string {
    return text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u0D7F]/gi, '')
      .trim();
  }

  public isClean(message: string): boolean {
    const tokens = this.normalizeIndic(message).split(/\s+/);
    for (const token of tokens) {
      if (this.prohibitedSet.has(token)) {
        return false;
      }
    }
    return true;
  }

  public updateProhibitedList(words: string[]) {
    this.prohibitedSet = new Set(words.map((w) => this.normalizeIndic(w)));
  }
}
