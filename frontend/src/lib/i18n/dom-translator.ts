import { HI_EXACT, HI_PATTERNS, HI_TITLE_SUFFIX } from './hi-dict';

/**
 * Hindi layer for the long tail of static interface text.
 *
 * It swaps the *content* of existing text nodes and a few attributes in place, never the DOM structure,
 * so React keeps working on the same nodes. Every swapped node remembers its English original, which makes
 * the switch fully reversible, and text React rewrites later is simply translated again.
 * Only exact, curated matches are replaced: anything unknown (user content, names, prices) is left alone.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SVG', 'IFRAME']);
const SKIP_SELECTOR = '[data-no-translate],[translate="no"],[contenteditable="true"]';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function translateText(raw: string): string | null {
  const key = norm(raw);
  if (!key) return null;
  const hit = HI_EXACT[key];
  if (hit !== undefined) return hit;
  for (const [re, fn] of HI_PATTERNS) {
    const m = re.exec(key);
    if (m) return fn(m);
  }
  return null;
}

/** Keeps the original leading / trailing whitespace so layout is unchanged. */
function withOuterSpace(raw: string, translated: string): string {
  const lead = /^\s*/.exec(raw)?.[0] ?? '';
  const trail = /\s*$/.exec(raw)?.[0] ?? '';
  return lead + translated + trail;
}

export function attachDomTranslator(root: HTMLElement): () => void {
  // text node -> { en: English as last written by React, hi: what we put there }
  const textState = new WeakMap<Text, { en: string; hi: string }>();
  const attrState = new WeakMap<Element, Map<string, { en: string; hi: string }>>();
  const touchedText = new Set<Text>();
  const touchedEls = new Set<Element>();
  let titleEn: string | null = null;
  let applyingTitle = false;

  const skipped = (el: Element | null): boolean => {
    for (let e = el; e; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true;
      if (e.matches?.(SKIP_SELECTOR)) return true;
    }
    return false;
  };

  const doText = (node: Text) => {
    const cur = node.nodeValue ?? '';
    const st = textState.get(node);
    if (st && cur === st.hi) return; // our own write
    if (skipped(node.parentElement)) return;
    const hi = translateText(cur);
    if (hi === null) {
      textState.delete(node);
      return;
    }
    const out = withOuterSpace(cur, hi);
    textState.set(node, { en: cur, hi: out });
    touchedText.add(node);
    node.nodeValue = out;
  };

  const doAttrs = (el: Element) => {
    if (skipped(el)) return;
    let map = attrState.get(el);
    for (const a of ATTRS) {
      const cur = el.getAttribute(a);
      if (cur == null) continue;
      const st = map?.get(a);
      if (st && cur === st.hi) continue;
      const hi = translateText(cur);
      if (hi === null) {
        map?.delete(a);
        continue;
      }
      if (!map) {
        map = new Map();
        attrState.set(el, map);
      }
      map.set(a, { en: cur, hi });
      touchedEls.add(el);
      el.setAttribute(a, hi);
    }
    if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'button')) {
      const cur = el.value;
      const hi = translateText(cur);
      if (hi !== null) el.value = hi;
    }
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      doText(node as Text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (SKIP_TAGS.has(el.tagName.toUpperCase())) return;
    doAttrs(el);
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n: Node | null = tw.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
      else doAttrs(n as Element);
      n = tw.nextNode();
    }
  };

  const doTitle = () => {
    const cur = document.title;
    if (applyingTitle) return;
    const hi = translateTitle(cur);
    if (hi && hi !== cur) {
      titleEn = cur;
      applyingTitle = true;
      document.title = hi;
      applyingTitle = false;
    }
  };

  const pending = new Set<Node>();
  let scheduled = 0;
  const flush = () => {
    scheduled = 0;
    const batch = Array.from(pending);
    pending.clear();
    for (const n of batch) if (n.isConnected) walk(n);
    doTitle();
  };
  const schedule = (n: Node) => {
    pending.add(n);
    if (!scheduled) scheduled = window.requestAnimationFrame(flush);
  };

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach((n) => schedule(n));
      else if (r.type === 'characterData') schedule(r.target);
      else if (r.type === 'attributes') schedule(r.target);
    }
  });

  walk(root);
  doTitle();
  mo.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
  const titleEl = document.querySelector('title');
  const titleMo = new MutationObserver(() => doTitle());
  if (titleEl) titleMo.observe(titleEl, { childList: true, characterData: true, subtree: true });

  return () => {
    mo.disconnect();
    titleMo.disconnect();
    if (scheduled) window.cancelAnimationFrame(scheduled);
    // restore English, but only where the node still shows our Hindi (React may have moved on)
    touchedText.forEach((n) => {
      const st = textState.get(n);
      if (st && n.nodeValue === st.hi) n.nodeValue = st.en;
    });
    touchedEls.forEach((el) => {
      attrState.get(el)?.forEach((st, a) => {
        if (el.getAttribute(a) === st.hi) el.setAttribute(a, st.en);
      });
    });
    if (titleEn !== null) document.title = titleEn;
  };
}

function translateTitle(title: string): string | null {
  const exact = translateText(title);
  if (exact !== null) return exact;
  const i = title.lastIndexOf(' | ');
  if (i > 0) {
    const head = translateText(title.slice(0, i));
    if (head !== null) return `${head} | ${HI_TITLE_SUFFIX}`;
  }
  return null;
}
