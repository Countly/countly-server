/**
 * XSS Filter - ES Module
 * Based on xss by Zongmin Lei <leizongmin@gmail.com>
 * Refactored as ES module
 */

// =============================================================================
// Utility Functions
// =============================================================================

const util = {
  indexOf(arr, item) {
    return arr.indexOf(item);
  },

  forEach(arr, fn, scope) {
    return arr.forEach(fn, scope);
  },

  trim(str) {
    return str.trim();
  },

  trimRight(str) {
    return str.trimEnd();
  },

  spaceIndex(str) {
    const match = /\s|\n|\t/.exec(str);
    return match ? match.index : -1;
  },
};

// =============================================================================
// CSS Whitelist
// =============================================================================

function getDefaultCSSWhiteList() {
  return {
    'align-content': false,
    'align-items': false,
    'align-self': false,
    'alignment-adjust': false,
    'alignment-baseline': false,
    'all': false,
    'anchor-point': false,
    'animation': false,
    'animation-delay': false,
    'animation-direction': false,
    'animation-duration': false,
    'animation-fill-mode': false,
    'animation-iteration-count': false,
    'animation-name': false,
    'animation-play-state': false,
    'animation-timing-function': false,
    'azimuth': false,
    'backface-visibility': false,
    'background': true,
    'background-attachment': true,
    'background-clip': true,
    'background-color': true,
    'background-image': true,
    'background-origin': true,
    'background-position': true,
    'background-repeat': true,
    'background-size': true,
    'baseline-shift': false,
    'binding': false,
    'bleed': false,
    'bookmark-label': false,
    'bookmark-level': false,
    'bookmark-state': false,
    'border': true,
    'border-bottom': true,
    'border-bottom-color': true,
    'border-bottom-left-radius': true,
    'border-bottom-right-radius': true,
    'border-bottom-style': true,
    'border-bottom-width': true,
    'border-collapse': true,
    'border-color': true,
    'border-image': true,
    'border-image-outset': true,
    'border-image-repeat': true,
    'border-image-slice': true,
    'border-image-source': true,
    'border-image-width': true,
    'border-left': true,
    'border-left-color': true,
    'border-left-style': true,
    'border-left-width': true,
    'border-radius': true,
    'border-right': true,
    'border-right-color': true,
    'border-right-style': true,
    'border-right-width': true,
    'border-spacing': true,
    'border-style': true,
    'border-top': true,
    'border-top-color': true,
    'border-top-left-radius': true,
    'border-top-right-radius': true,
    'border-top-style': true,
    'border-top-width': true,
    'border-width': true,
    'bottom': false,
    'box-decoration-break': true,
    'box-shadow': true,
    'box-sizing': true,
    'box-snap': true,
    'box-suppress': true,
    'break-after': true,
    'break-before': true,
    'break-inside': true,
    'caption-side': false,
    'chains': false,
    'clear': true,
    'clip': false,
    'clip-path': false,
    'clip-rule': false,
    'color': true,
    'color-interpolation-filters': true,
    'column-count': false,
    'column-fill': false,
    'column-gap': false,
    'column-rule': false,
    'column-rule-color': false,
    'column-rule-style': false,
    'column-rule-width': false,
    'column-span': false,
    'column-width': false,
    'columns': false,
    'contain': false,
    'content': false,
    'counter-increment': false,
    'counter-reset': false,
    'counter-set': false,
    'crop': false,
    'cue': false,
    'cue-after': false,
    'cue-before': false,
    'cursor': false,
    'direction': false,
    'display': true,
    'display-inside': true,
    'display-list': true,
    'display-outside': true,
    'dominant-baseline': false,
    'elevation': false,
    'empty-cells': false,
    'filter': false,
    'flex': false,
    'flex-basis': false,
    'flex-direction': false,
    'flex-flow': false,
    'flex-grow': false,
    'flex-shrink': false,
    'flex-wrap': false,
    'float': false,
    'float-offset': false,
    'flood-color': false,
    'flood-opacity': false,
    'flow-from': false,
    'flow-into': false,
    'font': true,
    'font-family': true,
    'font-feature-settings': true,
    'font-kerning': true,
    'font-language-override': true,
    'font-size': true,
    'font-size-adjust': true,
    'font-stretch': true,
    'font-style': true,
    'font-synthesis': true,
    'font-variant': true,
    'font-variant-alternates': true,
    'font-variant-caps': true,
    'font-variant-east-asian': true,
    'font-variant-ligatures': true,
    'font-variant-numeric': true,
    'font-variant-position': true,
    'font-weight': true,
    'grid': false,
    'grid-area': false,
    'grid-auto-columns': false,
    'grid-auto-flow': false,
    'grid-auto-rows': false,
    'grid-column': false,
    'grid-column-end': false,
    'grid-column-start': false,
    'grid-row': false,
    'grid-row-end': false,
    'grid-row-start': false,
    'grid-template': false,
    'grid-template-areas': false,
    'grid-template-columns': false,
    'grid-template-rows': false,
    'hanging-punctuation': false,
    'height': true,
    'hyphens': false,
    'icon': false,
    'image-orientation': false,
    'image-resolution': false,
    'ime-mode': false,
    'initial-letters': false,
    'inline-box-align': false,
    'justify-content': false,
    'justify-items': false,
    'justify-self': false,
    'left': false,
    'letter-spacing': true,
    'lighting-color': true,
    'line-box-contain': false,
    'line-break': false,
    'line-grid': false,
    'line-height': false,
    'line-snap': false,
    'line-stacking': false,
    'line-stacking-ruby': false,
    'line-stacking-shift': false,
    'line-stacking-strategy': false,
    'list-style': true,
    'list-style-image': true,
    'list-style-position': true,
    'list-style-type': true,
    'margin': true,
    'margin-bottom': true,
    'margin-left': true,
    'margin-right': true,
    'margin-top': true,
    'marker-offset': false,
    'marker-side': false,
    'marks': false,
    'mask': false,
    'mask-box': false,
    'mask-box-outset': false,
    'mask-box-repeat': false,
    'mask-box-slice': false,
    'mask-box-source': false,
    'mask-box-width': false,
    'mask-clip': false,
    'mask-image': false,
    'mask-origin': false,
    'mask-position': false,
    'mask-repeat': false,
    'mask-size': false,
    'mask-source-type': false,
    'mask-type': false,
    'max-height': true,
    'max-lines': false,
    'max-width': true,
    'min-height': true,
    'min-width': true,
    'move-to': false,
    'nav-down': false,
    'nav-index': false,
    'nav-left': false,
    'nav-right': false,
    'nav-up': false,
    'object-fit': false,
    'object-position': false,
    'opacity': false,
    'order': false,
    'orphans': false,
    'outline': false,
    'outline-color': false,
    'outline-offset': false,
    'outline-style': false,
    'outline-width': false,
    'overflow': false,
    'overflow-wrap': false,
    'overflow-x': false,
    'overflow-y': false,
    'padding': true,
    'padding-bottom': true,
    'padding-left': true,
    'padding-right': true,
    'padding-top': true,
    'page': false,
    'page-break-after': false,
    'page-break-before': false,
    'page-break-inside': false,
    'page-policy': false,
    'pause': false,
    'pause-after': false,
    'pause-before': false,
    'perspective': false,
    'perspective-origin': false,
    'pitch': false,
    'pitch-range': false,
    'play-during': false,
    'position': false,
    'presentation-level': false,
    'quotes': false,
    'region-fragment': false,
    'resize': false,
    'rest': false,
    'rest-after': false,
    'rest-before': false,
    'richness': false,
    'right': false,
    'rotation': false,
    'rotation-point': false,
    'ruby-align': false,
    'ruby-merge': false,
    'ruby-position': false,
    'shape-image-threshold': false,
    'shape-outside': false,
    'shape-margin': false,
    'size': false,
    'speak': false,
    'speak-as': false,
    'speak-header': false,
    'speak-numeral': false,
    'speak-punctuation': false,
    'speech-rate': false,
    'stress': false,
    'string-set': false,
    'tab-size': false,
    'table-layout': false,
    'text-align': true,
    'text-align-last': true,
    'text-combine-upright': true,
    'text-decoration': true,
    'text-decoration-color': true,
    'text-decoration-line': true,
    'text-decoration-skip': true,
    'text-decoration-style': true,
    'text-emphasis': true,
    'text-emphasis-color': true,
    'text-emphasis-position': true,
    'text-emphasis-style': true,
    'text-height': true,
    'text-indent': true,
    'text-justify': true,
    'text-orientation': true,
    'text-overflow': true,
    'text-shadow': true,
    'text-space-collapse': true,
    'text-transform': true,
    'text-underline-position': true,
    'text-wrap': true,
    'top': false,
    'transform': false,
    'transform-origin': false,
    'transform-style': false,
    'transition': false,
    'transition-delay': false,
    'transition-duration': false,
    'transition-property': false,
    'transition-timing-function': false,
    'unicode-bidi': false,
    'vertical-align': false,
    'visibility': false,
    'voice-balance': false,
    'voice-duration': false,
    'voice-family': false,
    'voice-pitch': false,
    'voice-range': false,
    'voice-rate': false,
    'voice-stress': false,
    'voice-volume': false,
    'volume': false,
    'white-space': false,
    'widows': false,
    'width': true,
    'will-change': false,
    'word-break': true,
    'word-spacing': true,
    'word-wrap': true,
    'wrap-flow': false,
    'wrap-through': false,
    'writing-mode': false,
    'z-index': false,
  };
}

// =============================================================================
// CSS Parser
// =============================================================================

function parseStyle(css, onAttr) {
  css = util.trimRight(css);
  if (css[css.length - 1] !== ';') css += ';';

  const cssLength = css.length;
  let isParenthesisOpen = false;
  let lastPos = 0;
  let retCSS = '';

  function addNewAttr(i) {
    if (!isParenthesisOpen) {
      const source = util.trim(css.slice(lastPos, i));
      const j = source.indexOf(':');
      if (j !== -1) {
        const name = util.trim(source.slice(0, j));
        const value = util.trim(source.slice(j + 1));
        if (name) {
          const ret = onAttr(lastPos, retCSS.length, name, value, source);
          if (ret) retCSS += ret + '; ';
        }
      }
    }
    lastPos = i + 1;
  }

  for (let i = 0; i < cssLength; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      if (j === -1) break;
      i = j + 1;
      lastPos = i + 1;
      isParenthesisOpen = false;
    } else if (c === '(') {
      isParenthesisOpen = true;
    } else if (c === ')') {
      isParenthesisOpen = false;
    } else if (c === ';') {
      if (!isParenthesisOpen) {
        addNewAttr(i);
      }
    } else if (c === '\n') {
      addNewAttr(i);
    }
  }

  return util.trim(retCSS);
}

// =============================================================================
// CSS Defaults
// =============================================================================

const REGEXP_URL_JAVASCRIPT = /javascript\s*:/gim;

const cssDefaults = {
  whiteList: getDefaultCSSWhiteList(),
  getDefaultWhiteList: getDefaultCSSWhiteList,
  onAttr() {},
  onIgnoreAttr() {},
  safeAttrValue(name, value) {
    if (REGEXP_URL_JAVASCRIPT.test(value)) return '';
    return value;
  },
};

// =============================================================================
// FilterCSS Class
// =============================================================================

function isNull(obj) {
  return obj === undefined || obj === null;
}

function shallowCopyObject(obj) {
  const ret = {};
  for (const i in obj) {
    ret[i] = obj[i];
  }
  return ret;
}

class FilterCSS {
  constructor(options = {}) {
    options = shallowCopyObject(options);
    options.whiteList = options.whiteList || cssDefaults.whiteList;
    options.onAttr = options.onAttr || cssDefaults.onAttr;
    options.onIgnoreAttr = options.onIgnoreAttr || cssDefaults.onIgnoreAttr;
    options.safeAttrValue = options.safeAttrValue || cssDefaults.safeAttrValue;
    this.options = options;
  }

  process(css) {
    css = css || '';
    css = css.toString();
    if (!css) return '';

    const { whiteList, onAttr, onIgnoreAttr, safeAttrValue } = this.options;

    const retCSS = parseStyle(css, (sourcePosition, position, name, value, source) => {
      const check = whiteList[name];
      let isWhite = false;
      if (check === true) {
        isWhite = true;
      } else if (typeof check === 'function') {
        isWhite = check(value);
      } else if (check instanceof RegExp) {
        isWhite = check.test(value);
      }

      value = safeAttrValue(name, value);
      if (!value) return;

      const opts = { position, sourcePosition, source, isWhite };

      if (isWhite) {
        const ret = onAttr(name, value, opts);
        if (isNull(ret)) {
          return name + ':' + value;
        }
        return ret;
      } else {
        const ret = onIgnoreAttr(name, value, opts);
        if (!isNull(ret)) {
          return ret;
        }
      }
    });

    return retCSS;
  }
}

function filterCSS(css, options) {
  const filter = new FilterCSS(options);
  return filter.process(css);
}

// =============================================================================
// HTML Whitelist
// =============================================================================

function getDefaultWhiteList() {
  return {
    a: ['target', 'href', 'title'],
    abbr: ['title'],
    address: [],
    area: ['shape', 'coords', 'href', 'alt'],
    article: [],
    aside: [],
    audio: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src'],
    b: [],
    bdi: ['dir'],
    bdo: ['dir'],
    big: [],
    blockquote: ['cite'],
    br: [],
    caption: [],
    center: [],
    cite: [],
    code: [],
    col: ['align', 'valign', 'span', 'width'],
    colgroup: ['align', 'valign', 'span', 'width'],
    dd: [],
    del: ['datetime'],
    details: ['open'],
    div: [],
    dl: [],
    dt: [],
    em: [],
    figcaption: [],
    figure: [],
    font: ['color', 'size', 'face'],
    footer: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    header: [],
    hr: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
    ins: ['datetime'],
    li: [],
    mark: [],
    nav: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    section: [],
    small: [],
    span: [],
    sub: [],
    summary: [],
    sup: [],
    strong: [],
    strike: [],
    table: ['width', 'border', 'align', 'valign'],
    tbody: ['align', 'valign'],
    td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
    tfoot: ['align', 'valign'],
    th: ['width', 'rowspan', 'colspan', 'align', 'valign'],
    thead: ['align', 'valign'],
    tr: ['rowspan', 'align', 'valign'],
    tt: [],
    u: [],
    ul: [],
    video: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'playsinline', 'poster', 'preload', 'src', 'height', 'width'],
  };
}

// =============================================================================
// HTML Parser
// =============================================================================

function getTagName(html) {
  const i = util.spaceIndex(html);
  let tagName = i === -1 ? html.slice(1, -1) : html.slice(1, i + 1);
  tagName = util.trim(tagName).toLowerCase();
  if (tagName[0] === '/') tagName = tagName.slice(1);
  if (tagName[tagName.length - 1] === '/') tagName = tagName.slice(0, -1);
  return tagName;
}

function isClosing(html) {
  return html.slice(0, 2) === '</';
}

function parseTag(html, onTag, escapeHtmlFn) {
  let rethtml = '';
  let lastPos = 0;
  let tagStart = false;
  let quoteStart = false;
  const len = html.length;

  chariterator: for (let currentPos = 0; currentPos < len; currentPos++) {
    const c = html.charAt(currentPos);

    if (tagStart === false) {
      if (c === '<') {
        tagStart = currentPos;
      }
      continue;
    }

    if (quoteStart === false) {
      if (c === '<') {
        rethtml += escapeHtmlFn(html.slice(lastPos, currentPos));
        tagStart = currentPos;
        lastPos = currentPos;
        continue;
      }

      if (c === '>' || currentPos === len - 1) {
        rethtml += escapeHtmlFn(html.slice(lastPos, tagStart));
        const currentHtml = html.slice(tagStart, currentPos + 1);
        const currentTagName = getTagName(currentHtml);
        rethtml += onTag(tagStart, rethtml.length, currentTagName, currentHtml, isClosing(currentHtml));
        lastPos = currentPos + 1;
        tagStart = false;
        continue;
      }

      if (c === '"' || c === "'") {
        let i = 1;
        let ic = html.charAt(currentPos - i);
        while (ic.trim() === '' || ic === '=') {
          if (ic === '=') {
            quoteStart = c;
            continue chariterator;
          }
          ic = html.charAt(currentPos - ++i);
        }
      }
    } else {
      if (c === quoteStart) {
        quoteStart = false;
      }
    }
  }

  if (lastPos < len) {
    rethtml += escapeHtmlFn(html.substr(lastPos));
  }

  return rethtml;
}

const REGEXP_ILLEGAL_ATTR_NAME = /[^a-zA-Z0-9_:.-]/gim;

function parseAttr(html, onAttr) {
  let lastPos = 0;
  const retAttrs = [];
  let tmpName = false;
  const len = html.length;

  function addAttr(name, value) {
    name = util.trim(name);
    name = name.replace(REGEXP_ILLEGAL_ATTR_NAME, '').toLowerCase();
    if (name.length < 1) return;
    const ret = onAttr(name, value || '');
    if (ret) retAttrs.push(ret);
  }

  function findNextEqual(str, i) {
    for (; i < str.length; i++) {
      const c = str[i];
      if (c === ' ') continue;
      if (c === '=') return i;
      return -1;
    }
    return -1;
  }

  function findNextQuotationMark(str, i) {
    for (; i < str.length; i++) {
      const c = str[i];
      if (c === ' ') continue;
      if (c === "'" || c === '"') return i;
      return -1;
    }
    return -1;
  }

  function findBeforeEqual(str, i) {
    for (; i > 0; i--) {
      const c = str[i];
      if (c === ' ') continue;
      if (c === '=') return i;
      return -1;
    }
    return -1;
  }

  function isQuoteWrapString(text) {
    return (text[0] === '"' && text[text.length - 1] === '"') ||
           (text[0] === "'" && text[text.length - 1] === "'");
  }

  function stripQuoteWrap(text) {
    return isQuoteWrapString(text) ? text.substr(1, text.length - 2) : text;
  }

  for (let i = 0; i < len; i++) {
    const c = html.charAt(i);

    if (tmpName === false && c === '=') {
      tmpName = html.slice(lastPos, i);
      lastPos = i + 1;
      const nextChar = html.charAt(lastPos);
      // lastMarkPos = (nextChar === '"' || nextChar === "'") ? lastPos : findNextQuotationMark(html, i + 1);
      continue;
    }

    if (tmpName !== false) {
      const nextChar = html.charAt(lastPos);
      if (nextChar === '"' || nextChar === "'") {
        const j = html.indexOf(nextChar, lastPos + 1);
        if (j === -1) break;
        const v = util.trim(html.slice(lastPos + 1, j));
        addAttr(tmpName, v);
        tmpName = false;
        i = j;
        lastPos = i + 1;
        continue;
      }
    }

    if (/\s|\n|\t/.test(c)) {
      html = html.replace(/\s|\n|\t/g, ' ');
      if (tmpName === false) {
        const j = findNextEqual(html, i);
        if (j === -1) {
          const v = util.trim(html.slice(lastPos, i));
          addAttr(v);
          tmpName = false;
          lastPos = i + 1;
        } else {
          i = j - 1;
        }
        continue;
      } else {
        const j = findBeforeEqual(html, i - 1);
        if (j === -1) {
          let v = util.trim(html.slice(lastPos, i));
          v = stripQuoteWrap(v);
          addAttr(tmpName, v);
          tmpName = false;
          lastPos = i + 1;
        }
        continue;
      }
    }
  }

  if (lastPos < html.length) {
    if (tmpName === false) {
      addAttr(html.slice(lastPos));
    } else {
      addAttr(tmpName, stripQuoteWrap(util.trim(html.slice(lastPos))));
    }
  }

  return util.trim(retAttrs.join(' '));
}

// =============================================================================
// HTML Defaults & Escape Functions
// =============================================================================

const REGEXP_LT = /</g;
const REGEXP_GT = />/g;
const REGEXP_QUOTE = /"/g;
const REGEXP_QUOTE_2 = /&quot;/g;
const REGEXP_ATTR_VALUE_1 = /&#([a-zA-Z0-9]*);?/gim;
const REGEXP_ATTR_VALUE_COLON = /&colon;?/gim;
const REGEXP_ATTR_VALUE_NEWLINE = /&newline;?/gim;
const REGEXP_DEFAULT_ON_TAG_ATTR_4 = /((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a):/gi;
const REGEXP_DEFAULT_ON_TAG_ATTR_7 = /e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/gi;
const REGEXP_DEFAULT_ON_TAG_ATTR_8 = /u\s*r\s*l\s*\(.*/gi;

function escapeHtml(html) {
  return html.replace(REGEXP_LT, '&lt;').replace(REGEXP_GT, '&gt;');
}

function escapeQuote(str) {
  return str.replace(REGEXP_QUOTE, '&quot;');
}

function unescapeQuote(str) {
  return str.replace(REGEXP_QUOTE_2, '"');
}

function escapeHtmlEntities(str) {
  return str.replace(REGEXP_ATTR_VALUE_1, (match, code) => {
    return code[0] === 'x' || code[0] === 'X'
      ? String.fromCharCode(parseInt(code.substr(1), 16))
      : String.fromCharCode(parseInt(code, 10));
  });
}

function escapeDangerHtml5Entities(str) {
  return str.replace(REGEXP_ATTR_VALUE_COLON, ':').replace(REGEXP_ATTR_VALUE_NEWLINE, ' ');
}

function clearNonPrintableCharacter(str) {
  let str2 = '';
  for (let i = 0, len = str.length; i < len; i++) {
    str2 += str.charCodeAt(i) < 32 ? ' ' : str.charAt(i);
  }
  return util.trim(str2);
}

function friendlyAttrValue(str) {
  str = unescapeQuote(str);
  str = escapeHtmlEntities(str);
  str = escapeDangerHtml5Entities(str);
  str = clearNonPrintableCharacter(str);
  return str;
}

function escapeAttrValue(str) {
  str = escapeQuote(str);
  str = escapeHtml(str);
  return str;
}

const defaultCSSFilter = new FilterCSS();

function safeAttrValue(tag, name, value, cssFilterInstance) {
  value = friendlyAttrValue(value);

  if (name === 'href' || name === 'src') {
    value = util.trim(value);
    if (value === '#') return '#';

    if (!(
      value.substr(0, 7) === 'http://' ||
      value.substr(0, 8) === 'https://' ||
      value.substr(0, 7) === 'mailto:' ||
      value.substr(0, 4) === 'tel:' ||
      value.substr(0, 11) === 'data:image/' ||
      value.substr(0, 6) === 'ftp://' ||
      value.substr(0, 2) === './' ||
      value.substr(0, 3) === '../' ||
      value[0] === '#' ||
      value[0] === '/'
    )) {
      return '';
    }
  } else if (name === 'background') {
    REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)) {
      return '';
    }
  } else if (name === 'style') {
    REGEXP_DEFAULT_ON_TAG_ATTR_7.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_7.test(value)) {
      return '';
    }
    REGEXP_DEFAULT_ON_TAG_ATTR_8.lastIndex = 0;
    if (REGEXP_DEFAULT_ON_TAG_ATTR_8.test(value)) {
      REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex = 0;
      if (REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)) {
        return '';
      }
    }
    if (cssFilterInstance !== false) {
      cssFilterInstance = cssFilterInstance || defaultCSSFilter;
      value = cssFilterInstance.process(value);
    }
  }

  value = escapeAttrValue(value);
  return value;
}

function onIgnoreTagStripAll() {
  return '';
}

function StripTagBody(tags, next) {
  if (typeof next !== 'function') {
    next = function() {};
  }

  const isRemoveAllTag = !Array.isArray(tags);

  function isRemoveTag(tag) {
    if (isRemoveAllTag) return true;
    return util.indexOf(tags, tag) !== -1;
  }

  const removeList = [];
  let posStart = false;

  return {
    onIgnoreTag(tag, html, options) {
      if (isRemoveTag(tag)) {
        if (options.isClosing) {
          const ret = '[/removed]';
          const end = options.position + ret.length;
          removeList.push([posStart !== false ? posStart : options.position, end]);
          posStart = false;
          return ret;
        } else {
          if (!posStart) {
            posStart = options.position;
          }
          return '[removed]';
        }
      } else {
        return next(tag, html, options);
      }
    },
    remove(html) {
      let rethtml = '';
      let lastPos = 0;
      util.forEach(removeList, (pos) => {
        rethtml += html.slice(lastPos, pos[0]);
        lastPos = pos[1];
      });
      rethtml += html.slice(lastPos);
      return rethtml;
    },
  };
}

function stripCommentTag(html) {
  let retHtml = '';
  let lastPos = 0;
  while (lastPos < html.length) {
    const i = html.indexOf('<!--', lastPos);
    if (i === -1) {
      retHtml += html.slice(lastPos);
      break;
    }
    retHtml += html.slice(lastPos, i);
    const j = html.indexOf('-->', i);
    if (j === -1) {
      break;
    }
    lastPos = j + 3;
  }
  return retHtml;
}

function stripBlankChar(html) {
  const chars = html.split('');
  return chars.filter((char) => {
    const c = char.charCodeAt(0);
    if (c === 127) return false;
    if (c <= 31) {
      if (c === 10 || c === 13) return true;
      return false;
    }
    return true;
  }).join('');
}

// =============================================================================
// FilterXSS Class
// =============================================================================

function keysToLowerCase(obj) {
  const ret = {};
  for (const i in obj) {
    if (Array.isArray(obj[i])) {
      ret[i.toLowerCase()] = obj[i].map((item) => item.toLowerCase());
    } else {
      ret[i.toLowerCase()] = obj[i];
    }
  }
  return ret;
}

function getAttrs(html) {
  const i = util.spaceIndex(html);
  if (i === -1) {
    return {
      html: '',
      closing: html[html.length - 2] === '/',
    };
  }
  html = util.trim(html.slice(i + 1, -1));
  const isClosingTag = html[html.length - 1] === '/';
  if (isClosingTag) html = util.trim(html.slice(0, -1));
  return {
    html,
    closing: isClosingTag,
  };
}

const htmlDefaults = {
  whiteList: getDefaultWhiteList(),
  getDefaultWhiteList,
  onTag() {},
  onIgnoreTag() {},
  onTagAttr() {},
  onIgnoreTagAttr() {},
  safeAttrValue,
  escapeHtml,
  escapeQuote,
  unescapeQuote,
  escapeHtmlEntities,
  escapeDangerHtml5Entities,
  clearNonPrintableCharacter,
  friendlyAttrValue,
  escapeAttrValue,
  onIgnoreTagStripAll,
  StripTagBody,
  stripCommentTag,
  stripBlankChar,
  cssFilter: defaultCSSFilter,
  getDefaultCSSWhiteList,
};

class FilterXSS {
  constructor(options = {}) {
    options = shallowCopyObject(options);

    if (options.stripIgnoreTag) {
      if (options.onIgnoreTag) {
        console.error('Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time');
      }
      options.onIgnoreTag = htmlDefaults.onIgnoreTagStripAll;
    }

    if (options.whiteList || options.allowList) {
      options.whiteList = keysToLowerCase(options.whiteList || options.allowList);
    } else {
      options.whiteList = htmlDefaults.whiteList;
    }

    options.onTag = options.onTag || htmlDefaults.onTag;
    options.onTagAttr = options.onTagAttr || htmlDefaults.onTagAttr;
    options.onIgnoreTag = options.onIgnoreTag || htmlDefaults.onIgnoreTag;
    options.onIgnoreTagAttr = options.onIgnoreTagAttr || htmlDefaults.onIgnoreTagAttr;
    options.safeAttrValue = options.safeAttrValue || htmlDefaults.safeAttrValue;
    options.escapeHtml = options.escapeHtml || htmlDefaults.escapeHtml;
    this.options = options;

    if (options.css === false) {
      this.cssFilter = false;
    } else {
      options.css = options.css || {};
      this.cssFilter = new FilterCSS(options.css);
    }
  }

  process(html) {
    html = html || '';
    html = html.toString();
    if (!html) return '';

    const { options, cssFilter } = this;
    const { whiteList, onTag, onIgnoreTag, onTagAttr, onIgnoreTagAttr, safeAttrValue: safeAttrValueFn, escapeHtml: escapeHtmlFn } = options;

    if (options.stripBlankChar) {
      html = htmlDefaults.stripBlankChar(html);
    }

    if (!options.allowCommentTag) {
      html = htmlDefaults.stripCommentTag(html);
    }

    let stripIgnoreTagBody = false;
    let currentOnIgnoreTag = onIgnoreTag;
    if (options.stripIgnoreTagBody) {
      stripIgnoreTagBody = htmlDefaults.StripTagBody(options.stripIgnoreTagBody, onIgnoreTag);
      currentOnIgnoreTag = stripIgnoreTagBody.onIgnoreTag;
    }

    let retHtml = parseTag(
      html,
      (sourcePosition, position, tag, tagHtml, closing) => {
        const info = {
          sourcePosition,
          position,
          isClosing: closing,
          isWhite: Object.prototype.hasOwnProperty.call(whiteList, tag),
        };

        const ret = onTag(tag, tagHtml, info);
        if (!isNull(ret)) return ret;

        if (info.isWhite) {
          if (info.isClosing) {
            return '</' + tag + '>';
          }

          const attrs = getAttrs(tagHtml);
          const whiteAttrList = whiteList[tag];
          const attrsHtml = parseAttr(attrs.html, (name, value) => {
            const isWhiteAttr = util.indexOf(whiteAttrList, name) !== -1;
            const attrRet = onTagAttr(tag, name, value, isWhiteAttr);
            if (!isNull(attrRet)) return attrRet;

            if (isWhiteAttr) {
              value = safeAttrValueFn(tag, name, value, cssFilter);
              if (value) {
                return name + '="' + value + '"';
              }
              return name;
            } else {
              const ignoreRet = onIgnoreTagAttr(tag, name, value, isWhiteAttr);
              if (!isNull(ignoreRet)) return ignoreRet;
              return;
            }
          });

          let newHtml = '<' + tag;
          if (attrsHtml) newHtml += ' ' + attrsHtml;
          if (attrs.closing) newHtml += ' /';
          newHtml += '>';
          return newHtml;
        } else {
          const ignoreRet = currentOnIgnoreTag(tag, tagHtml, info);
          if (!isNull(ignoreRet)) return ignoreRet;
          return escapeHtmlFn(tagHtml);
        }
      },
      escapeHtmlFn
    );

    if (stripIgnoreTagBody) {
      retHtml = stripIgnoreTagBody.remove(retHtml);
    }

    return retHtml;
  }
}

// =============================================================================
// Main filterXSS function
// =============================================================================

function filterXSS(html, options) {
  const xss = new FilterXSS(options);
  return xss.process(html);
}

// =============================================================================
// Browser/Worker Global Export
// =============================================================================

if (typeof window !== 'undefined') {
  window.filterXSS = filterXSS;
}

if (typeof self !== 'undefined' && typeof DedicatedWorkerGlobalScope !== 'undefined') {
  try {
    if (self instanceof DedicatedWorkerGlobalScope) {
      self.filterXSS = filterXSS;
    }
  } catch (e) {
    // Not in a worker context
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  // Main functions
  filterXSS,
  filterCSS,

  // Classes
  FilterXSS,
  FilterCSS,

  // HTML defaults
  getDefaultWhiteList,
  escapeHtml,
  escapeQuote,
  unescapeQuote,
  escapeHtmlEntities,
  escapeDangerHtml5Entities,
  clearNonPrintableCharacter,
  friendlyAttrValue,
  escapeAttrValue,
  safeAttrValue,
  onIgnoreTagStripAll,
  StripTagBody,
  stripCommentTag,
  stripBlankChar,

  // CSS defaults
  getDefaultCSSWhiteList,

  // Parsers
  parseTag,
  parseAttr,
  parseStyle,

  // Utilities
  isNull,
  shallowCopyObject,

  // Default configurations
  htmlDefaults,
  cssDefaults,
};

// Default export
export default filterXSS;