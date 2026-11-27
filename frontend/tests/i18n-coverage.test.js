// Run: node frontend/tests/i18n-coverage.test.js (requires `typescript`, already in devDependencies)
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const ts = require('typescript');

const FRONTEND_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');

// ---------------------------------------------------------------------------
// 1. Transpile TS modules cleanly into a temp dir with `@/` alias support
// ---------------------------------------------------------------------------
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-i18n-'));

function compileDir(srcSubdir) {
  const fullSrc = path.join(SRC_DIR, srcSubdir);
  for (const entry of fs.readdirSync(fullSrc, { withFileTypes: true })) {
    const abs = path.join(fullSrc, entry.name);
    const rel = path.relative(SRC_DIR, abs);
    if (entry.isDirectory()) {
      compileDir(rel);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    let source = fs.readFileSync(abs, 'utf8');
    // Rewrite `@/...` imports to relative paths inside TMP_DIR
    const outPath = path.join(TMP_DIR, rel.replace(/\.(ts|tsx)$/, '.js'));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    source = source.replace(/from\s+(['"])@\/([^'"]+)\1/g, (_, q, target) => {
      const targetOut = path.join(TMP_DIR, target);
      let relImport = path.relative(path.dirname(outPath), targetOut).replace(/\\/g, '/');
      if (!relImport.startsWith('.')) relImport = `./${relImport}`;
      return `from ${q}${relImport}${q}`;
    });
    const transpiled = ts.transpileModule(source, {
      fileName: abs,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;
    fs.writeFileSync(outPath, transpiled, 'utf8');
  }
}

compileDir('lib');
compileDir('data');
compileDir(path.join('app', 'about'));
compileDir(path.join('app', 'admin'));

// Stub React for `context.tsx` if required transitively
const Module = require('module');
const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') {
    return {
      createContext: (v) => v,
      useContext: () => ({ lang: 'en', setLang: () => {}, toggleLang: () => {}, t: (a) => a }),
      useState: (v) => [v, () => {}],
      useEffect: () => {},
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
    };
  }
  return origLoad.apply(this, arguments);
};

const hiDict = require(path.join(TMP_DIR, 'lib', 'i18n', 'hi-dict.js'));
const domMod = require(path.join(TMP_DIR, 'lib', 'i18n', 'dom-translator.js'));
const fmtMod = require(path.join(TMP_DIR, 'lib', 'i18n', 'format.js'));
const ecoMod = require(path.join(TMP_DIR, 'lib', 'economy.js'));
const catMod = require(path.join(TMP_DIR, 'data', 'poojaCatalog.js'));
const adminI18n = require(path.join(TMP_DIR, 'app', 'admin', 'admin-i18n.js'));

let passed = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  passed++;
};

// ---------------------------------------------------------------------------
// 2. Unit tests: hi-dict, patterns, title translation & smart quotes
// ---------------------------------------------------------------------------
const exactKeys = Object.keys(hiDict.HI_EXACT);
ok(exactKeys.length > 350, `HI_EXACT populated (${exactKeys.length})`);

const nonDev = [];
for (const k of exactKeys) {
  const v = hiDict.HI_EXACT[k];
  ok(typeof v === 'string' && v.trim().length > 0, `non-empty HI_EXACT value for "${k}"`);
  if (/^(?:1080p HD|720p HD|480p SD|[A-Za-z0-9+/.-]{1,6})$/.test(k) && v === k) continue;
  if (/^\+?\d[\d\s()-]+\(WhatsApp\)$/.test(k) && v === k) continue;
  if (!/[\u0900-\u097F]/.test(v)) nonDev.push(`${k} => ${v}`);
}
ok(nonDev.length === 0, `Unexpected non-Devanagari HI_EXACT values: ${nonDev.join('; ')}`);

// Required route titles & legacy Pandit Ji checks
const requiredTitles = [
  'Param Darshan - Sacred Live Pooja, Aarti & Vedic Astrology Worldwide',
  'Account & Security Settings | Param Darshan',
  'Admin Operations Console | Param Darshan',
  'Free Kundli Online - Janam Kundali, Dasha & Avakhada | Param Darshan',
  'Terms of Service | Param Darshan',
  'Privacy Policy (DPDP Act 2023 Compliant) | Param Darshan',
  'Refund & Cancellation Policy | Param Darshan',
  'Grievance Redressal Mechanism | Param Darshan',
  'Vedic Pandit Verification & Code of Ethics | Param Darshan',
  'Pandit Ji Earnings & Payouts | Param Darshan',
  'Go Live — Broadcast Setup | Param Darshan',
  'My Broadcasts & Sessions | Param Darshan',
];
for (const title of requiredTitles) {
  const tr = domMod.translateTitle(title);
  ok(Boolean(tr) && /[\u0900-\u097F]/.test(tr), `translateTitle("${title}") -> "${tr}"`);
  ok(!tr.includes('|  |'), `translateTitle("${title}") has no double pipe delimiter: "${tr}"`);
}
ok(
  domMod.translateTitle('Acharya Sharma Live | Param Darshan') === 'Acharya Sharma Live | परम दर्शन',
  'translateTitle translates dynamic head suffix cleanly'
);
ok(
  domMod.translateTitle('Terms of Service | Param Darshan') === 'सेवा की शर्तें | परम दर्शन',
  'Terms of Service title uses nominative Hindi override'
);

// Smart quote normalization
ok(
  domMod.translateText('Connect with Bharat’s holy sanctums, receive blessings from verified Vedic Pandits, and book personalized sanctum poojas.') !== null,
  'curly apostrophe matches exact dict'
);

// Dynamic HI_PATTERNS
ok(domMod.translateText('+100 Coins') === '+100 कॉइन', 'signed +100 Coins matches HI_PATTERNS');
ok(domMod.translateText('-25 Coins') === '-25 कॉइन', 'signed -25 Coins matches HI_PATTERNS');
ok(domMod.translateText('3 mins darshan available') === '3 मिनट दर्शन उपलब्ध', 'darshan availability matches HI_PATTERNS');
ok(domMod.translateText('Recharge for ₹299') === '₹299 में रिचार्ज करें', 'recharge amount matches HI_PATTERNS');
ok(domMod.translateText('Scheduled & Active (4)') === 'अनुसूचित एवं सक्रिय (4)', 'scheduled tab count matches HI_PATTERNS');
ok(domMod.translateText('Concluded History (2)') === 'संपन्न प्रसारण (2)', 'concluded tab count matches HI_PATTERNS');

// ---------------------------------------------------------------------------
// 3. Unit tests: DOM Translator EN -> HI -> EN round-trip + input restore
// ---------------------------------------------------------------------------
function makeFakeDom() {
  class FakeNode {
    constructor(nodeType) {
      this.nodeType = nodeType;
      this.parentNode = null;
      this.parentElement = null;
      this.childNodes = [];
    }
    appendChild(child) {
      child.parentNode = this;
      child.parentElement = this.nodeType === 1 ? this : this.parentElement;
      this.childNodes.push(child);
      return child;
    }
  }
  class FakeText extends FakeNode {
    constructor(val) {
      super(3);
      this.nodeValue = val;
    }
  }
  class FakeElement extends FakeNode {
    constructor(tagName, attrs = {}) {
      super(1);
      this.tagName = tagName.toUpperCase();
      this.attrs = { ...attrs };
    }
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name);
    }
    getAttribute(name) {
      return this.hasAttribute(name) ? this.attrs[name] : null;
    }
    setAttribute(name, val) {
      this.attrs[name] = String(val);
    }
    matches(selector) {
      const parts = selector.split(',').map((s) => s.trim());
      for (const part of parts) {
        const kv = part.match(/^\[([^=\]]+)="([^"]*)"\]$/);
        if (kv && this.getAttribute(kv[1]) === kv[2]) return true;
        const bare = part.match(/^\[([^=\]]+)\]$/);
        if (bare && this.hasAttribute(bare[1])) return true;
      }
      return false;
    }
    closest(selector) {
      let cur = this;
      while (cur && cur.nodeType === 1) {
        if (cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    querySelectorAll(sel) {
      const wantInput = sel.includes('input');
      const wantAttr = sel.includes('[placeholder]') || sel.includes('[aria-label]') || sel.includes('[title]') || sel.includes('[alt]');
      const out = [];
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 1) {
            const matchesAttr =
              wantAttr &&
              (c.hasAttribute('placeholder') ||
                c.hasAttribute('aria-label') ||
                c.hasAttribute('title') ||
                c.hasAttribute('alt'));
            const matchesInput = wantInput && c.tagName === 'INPUT';
            if (matchesAttr || matchesInput) out.push(c);
            walk(c);
          }
        }
      };
      walk(this);
      return out;
    }
  }
  class FakeInputElement extends FakeElement {
    constructor(type, value, attrs = {}) {
      super('INPUT', { type, ...attrs });
      this.type = type;
      this.value = value;
    }
  }

  global.Element = FakeElement;
  global.HTMLInputElement = FakeInputElement;
  global.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
  global.NodeFilter = { SHOW_TEXT: 4, SHOW_ELEMENT: 1 };
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  global.document = {
    title: 'Sign In | Param Darshan',
    querySelector() {
      return null;
    },
    createTreeWalker(root, what) {
      const nodes = [];
      const includeEl = (what & 1) !== 0;
      const includeTxt = (what & 4) !== 0;
      const walk = (n) => {
        if (n.nodeType === 1 && includeEl) nodes.push(n);
        if (n.nodeType === 3 && includeTxt) nodes.push(n);
        for (const c of n.childNodes) walk(c);
      };
      walk(root);
      let i = -1;
      return {
        nextNode() {
          i++;
          return i < nodes.length ? nodes[i] : null;
        },
      };
    },
  };

  const root = new FakeElement('DIV');
  const h1 = new FakeElement('H1');
  const txt = new FakeText('Sign In to Your Account');
  h1.appendChild(txt);
  const submitBtn = new FakeInputElement('submit', 'Sign In', { title: 'Sign In', 'aria-label': 'Sign In' });
  const textInput = new FakeInputElement('text', '', { placeholder: 'Search pooja, pandit...' });
  const keepBox = new FakeElement('SPAN', { 'data-no-translate': 'true' });
  const keepTxt = new FakeText('Sign In');
  keepBox.appendChild(keepTxt);
  root.appendChild(h1);
  root.appendChild(submitBtn);
  root.appendChild(textInput);
  root.appendChild(keepBox);
  return { root, txt, submitBtn, textInput, keepTxt };
}

const dom = makeFakeDom();
const detach = domMod.attachDomTranslator(dom.root);
ok(dom.txt.nodeValue === 'अपने खाते में साइन इन करें', 'DOM translator translates text node to Hindi');
ok(dom.submitBtn.value === 'साइन इन', 'DOM translator translates input[type=submit] value to Hindi');
ok(dom.submitBtn.getAttribute('title') === 'साइन इन', 'DOM translator translates title attribute');
ok(dom.submitBtn.getAttribute('aria-label') === 'साइन इन', 'DOM translator translates aria-label attribute');
ok(dom.textInput.getAttribute('placeholder') === 'पूजा, पंडित खोजें…', 'DOM translator translates placeholder attribute');
ok(dom.keepTxt.nodeValue === 'Sign In', 'DOM translator respects [data-no-translate]');
ok(global.document.title === 'साइन इन | परम दर्शन', 'DOM translator translates document.title');

detach();
ok(dom.txt.nodeValue === 'Sign In to Your Account', 'detach() restores text node back to English');
ok(dom.submitBtn.value === 'Sign In', 'detach() restores input[type=submit] value back to English');
ok(dom.submitBtn.getAttribute('title') === 'Sign In', 'detach() restores title attribute back to English');
ok(dom.submitBtn.getAttribute('aria-label') === 'Sign In', 'detach() restores aria-label back to English');
ok(dom.textInput.getAttribute('placeholder') === 'Search pooja, pandit...', 'detach() restores placeholder back to English');
ok(global.document.title === 'Sign In | Param Darshan', 'detach() restores document.title back to English');

// ---------------------------------------------------------------------------
// 4. Unit tests: format helpers, economy packs, pooja catalog & admin copy
// ---------------------------------------------------------------------------
ok(fmtMod.formatCoins(250, 'hi').includes('कॉइन'), 'formatCoins renders Hindi');
ok(fmtMod.formatSignedCoins(100, true, 'hi').startsWith('+100') && fmtMod.formatSignedCoins(100, true, 'hi').includes('कॉइन'), 'formatSignedCoins credit');
ok(fmtMod.formatSignedCoins(25, false, 'hi').startsWith('-25') && fmtMod.formatSignedCoins(25, false, 'hi').includes('कॉइन'), 'formatSignedCoins debit');
ok(/[\u0900-\u097F]/.test(fmtMod.formatLocaleDate('2026-06-21T00:00:00Z', 'hi')), 'formatLocaleDate formats in hi-IN');
ok(/[\u0900-\u097F]/.test(fmtMod.translateCategoryLabel('Pooja', 'hi')), 'translateCategoryLabel translates Pooja');

for (const pkg of ecoMod.DEFAULT_COIN_PACKAGES) {
  const disp = ecoMod.getCoinPackageDisplay(pkg, 'hi');
  ok(/[\u0900-\u097F]/.test(disp.title), `coin package ${pkg.sku} has Hindi title`);
}
for (const p of catMod.COMPREHENSIVE_POOJA_CATALOG) {
  const lp = catMod.getLocalizedPooja(p, 'hi');
  ok(/[\u0900-\u097F]/.test(lp.displayName), `pooja ${p.id} has Hindi name`);
  ok(/[\u0900-\u097F]/.test(lp.description), `pooja ${p.id} has Hindi description`);
}
for (const pan of catMod.PANDIT_PRICING_CATALOG) {
  const lpan = catMod.getLocalizedPanditPricing(pan, 'hi');
  ok(/[\u0900-\u097F]/.test(lpan.title), `pandit ${pan.panditId} has Hindi title`);
  ok(/[\u0900-\u097F]/.test(lpan.lineage), `pandit ${pan.panditId} has Hindi lineage`);
}
for (const [k, c] of Object.entries(adminI18n.CONFIRM_COPY)) {
  ok(/[\u0900-\u097F]/.test(c.titleHi) && /[\u0900-\u097F]/.test(c.descHi('Test')) && /[\u0900-\u097F]/.test(c.confirmHi), `CONFIRM_COPY.${k} has Hindi copy`);
}

// ---------------------------------------------------------------------------
// 5. TypeScript Compiler AST coverage audit over all `.tsx` components/pages
// ---------------------------------------------------------------------------
function walkTsx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsx(abs, acc);
    else if (entry.name.endsWith('.tsx')) acc.push(abs);
  }
  return acc;
}

const SKIP_EXACT = new Set([
  'Param Darshan', 'UPI', 'OTP', '2FA', 'KYC', 'UTR', 'CSV', 'DPDP', 'HDFC',
  'Razorpay', 'LiveKit', 'LiveKit SFU', 'NEFT', 'IMPS', 'RTGS', 'IST', 'EN',
  'AM', 'PM', 'ID', 'IP', 'URL', 'SKU', 'A/C', 'D1', 'D9', 'GMT', 'FAQ', 'FAQs',
  'JSON', 'Ctrl', 'Esc', 'K', 'v1', 'MB', 'KB', 'HD', 'Audio', 'Video', 'PDF',
  'WhatsApp', 'YouTube', 'Google', 'Chrome', 'Safari', 'Firefox', 'Ctrl + K',
  'Ctrl+K', 'OM', 'Om', 'N/A', 'OK', 'VIP', 'English',
]);

function decodeEntities(raw) {
  return String(raw || '')
    .replace(/&(?:ldquo|rdquo|lsquo|rsquo|quot|apos|amp|nbsp|mdash|ndash|bull|hellip);/g, ' ')
    .replace(/&#?\w+;/g, ' ');
}

function needsTranslation(raw) {
  const s = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  if (!s || s.length < 3) return false;
  if (!/[A-Za-z]{2,}/.test(s)) return false;
  if (/[\u0900-\u097F]/.test(s)) return false; // already Hindi / bilingual
  const stripped = s.replace(/^[\s•·|:\-–—()]+|[\s•·|:\-–—()]+$/g, '');
  if (SKIP_EXACT.has(s) || SKIP_EXACT.has(stripped)) return false;
  if (/^(https?:|mailto:|tel:|\/|#|@|\+|₹|\d|Rs\.?)/i.test(stripped) && stripped.split(/\s+/).length === 1) return false;
  if (/^[A-Z0-9_.:/-]+$/.test(stripped) && !/[A-Z]{3,}/.test(stripped)) return false;
  if (/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(stripped)) return false;
  if (/^\d[\d.,\s:+\-/*xX%₹()]*$/.test(stripped)) return false;
  if (domMod.translateText(s) !== null) return false;
  return true;
}

function isInsideNoTranslate(node) {
  let cur = node;
  while (cur) {
    if (ts.isJsxElement(cur) || ts.isJsxSelfClosingElement(cur)) {
      const attrs = ts.isJsxElement(cur) ? cur.openingElement.attributes : cur.attributes;
      for (const p of attrs.properties) {
        if (ts.isJsxAttribute(p) && p.name.text === 'data-no-translate') return true;
      }
    }
    cur = cur.parent;
  }
  return false;
}

function isInsideI18nCall(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const expr = cur.expression;
      const fn = ts.isIdentifier(expr)
        ? expr.text
        : ts.isPropertyAccessExpression(expr)
        ? expr.name.text
        : '';
      if (['L', 't', 'bi', 'translateText', 'translateCategoryLabel', 'translateAdminToken', 'tK'].includes(fn)) {
        return true;
      }
    }
    if (ts.isConditionalExpression(cur)) {
      const condText = cur.condition.getText();
      if (condText.includes('lang') || condText.includes('isHi')) return true;
    }
    if (ts.isBinaryExpression(cur) && cur.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const leftText = cur.left.getText();
      if (leftText.includes('lang') || leftText.includes('isHi')) return true;
    }
    cur = cur.parent;
  }
  return false;
}

const uncovered = [];
const tsxFiles = walkTsx(SRC_DIR);
for (const file of tsxFiles) {
  const code = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = path.relative(FRONTEND_DIR, file).replace(/\\/g, '/');

  function visit(node) {
    // 1. Raw JSXText nodes
    if (ts.isJsxText(node) && !node.containsOnlyTrivia) {
      if (!isInsideNoTranslate(node) && !isInsideI18nCall(node)) {
        const text = node.text.replace(/\s+/g, ' ').trim();
        if (needsTranslation(text)) {
          const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          uncovered.push(`${rel}:${lc.line + 1} [JsxText] "${text}"`);
        }
      }
    }
    // 2. JSX string attributes visible to users (literal OR `{expr}` strings not in L/t/lang)
    if (ts.isJsxAttribute(node) && node.initializer) {
      const attr = node.name.text;
      const isUiAttr = ['placeholder', 'aria-label', 'title', 'alt', 'label', 'heading', 'subtitle', 'confirmLabel', 'cancelLabel', 'emptyMessage'].includes(attr);
      if (isUiAttr && !isInsideNoTranslate(node) && !isInsideI18nCall(node)) {
        if (ts.isStringLiteral(node.initializer)) {
          const text = node.initializer.text;
          if (needsTranslation(text)) {
            const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
            uncovered.push(`${rel}:${lc.line + 1} [${attr}] "${text}"`);
          }
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          const inspectAttrExpr = (expr) => {
            if (!expr || isInsideI18nCall(expr)) return;
            if (ts.isConditionalExpression(expr)) {
              inspectAttrExpr(expr.whenTrue);
              inspectAttrExpr(expr.whenFalse);
              return;
            }
            if (ts.isBinaryExpression(expr)) {
              if (
                expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                expr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
                expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
              ) {
                inspectAttrExpr(expr.right);
              }
              return;
            }
            if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
              if (needsTranslation(expr.text)) {
                const lc = sf.getLineAndCharacterOfPosition(expr.getStart(sf));
                uncovered.push(`${rel}:${lc.line + 1} [${attr}:expr] "${expr.text}"`);
              }
            } else {
              ts.forEachChild(expr, inspectAttrExpr);
            }
          };
          inspectAttrExpr(node.initializer.expression);
        }
      }
    }
    // 3. toast.*(...) static literals & template literals not inside L/t/bi or HI_EXACT
    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sf);
      if (/^(toast\.(success|error|info|warning)|toast)$/.test(exprText) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (!isInsideI18nCall(arg)) {
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
            if (needsTranslation(arg.text)) {
              const lc = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
              uncovered.push(`${rel}:${lc.line + 1} [${exprText}] "${arg.text}"`);
            }
          } else if (ts.isTemplateExpression(arg)) {
            const rawSpans = [arg.head.text, ...arg.templateSpans.map((sp) => sp.literal.text)].join(' ').trim();
            if (needsTranslation(rawSpans)) {
              const lc = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
              uncovered.push(`${rel}:${lc.line + 1} [${exprText}:tpl] "${rawSpans}"`);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

console.log(`Scanned ${tsxFiles.length} .tsx files; uncovered user strings = ${uncovered.length}`);
if (uncovered.length > 0) {
  console.error('Uncovered UI strings found:');
  for (const item of uncovered) console.error('  -', item);
  process.exit(1);
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log(`OK ${passed} unit checks + ${tsxFiles.length} TSX files with 0 uncovered strings`);
