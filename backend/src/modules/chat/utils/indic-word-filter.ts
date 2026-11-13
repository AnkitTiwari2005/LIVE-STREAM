const INDIC = /[ऀ-ൿ]/;
const LEET: Record<string, string> = { '@': 'a', '0': 'o', '1': 'i', '3': 'e', '$': 's', '5': 's', '7': 't', '!': 'i' };

export class IndicWordFilter {
  private phrases: string[] = [];
  private latinWords = new Set<string>();
  private indicWords: string[] = [];

  constructor(prohibitedWords: string[]) {
    this.updateProhibitedList(prohibitedWords);
  }

  /**
   * Normalizes Indic text using Unicode NFKC.
   * Crucial: DOES NOT strip combining marks in Indic range (ऀ-ॿ)
   * so Devanagari matras (vowels) and virama remain completely intact.
   */
  public normalizeIndic(text: string): string {
    return text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[​-‍⁠﻿]/g, '') // zero-width characters used to split words
      .replace(/[^\w\sऀ-ൿ]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "s c a m" -> "scam": join runs of 2+ single Latin letters (spacing out a word is the oldest bypass). */
  private squashSpacedLetters(text: string): string {
    return text.replace(/(?:^| )((?:[a-z] ){1,}[a-z])(?= |$)/g, (m, run: string) => (m.startsWith(' ') ? ' ' : '') + run.replace(/ /g, ''));
  }

  private leet(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(/[@013$57!]/g, (c) => LEET[c] ?? c);
  }

  /** Candidate renderings of the message that a banned word could hide in. */
  private variants(message: string): string[] {
    const plain = this.normalizeIndic(message);
    const leeted = this.normalizeIndic(this.leet(message));
    const out = new Set<string>([plain, leeted, this.squashSpacedLetters(plain), this.squashSpacedLetters(leeted)]);
    return [...out];
  }

  public isClean(message: string): boolean {
    for (const v of this.variants(message)) {
      const tokens = v.split(' ');
      // single Latin words: whole-token match, so "scam" does not block "scamper"
      for (const t of tokens) if (this.latinWords.has(t)) return false;
      // multi-word entries: whole-word phrase match
      const padded = ` ${v} `;
      for (const p of this.phrases) if (padded.includes(` ${p} `)) return false;
      // Indic entries: substring match, because Indic words compound without spaces (धोखा -> धोखाधड़ी)
      for (const w of this.indicWords) if (v.includes(w)) return false;
    }
    return true;
  }

  public updateProhibitedList(words: string[]) {
    this.phrases = [];
    this.latinWords = new Set();
    this.indicWords = [];
    for (const raw of words) {
      const w = this.normalizeIndic(raw);
      if (!w) continue;
      if (INDIC.test(w)) this.indicWords.push(w);
      else if (w.includes(' ')) this.phrases.push(w);
      else this.latinWords.add(w);
    }
  }
}
