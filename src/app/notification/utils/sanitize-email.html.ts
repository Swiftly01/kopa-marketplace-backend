import sanitizeHtml from 'sanitize-html';

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'blockquote',
      'code',
      'pre',
      'h1',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'span',
      'div',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'],
    },
    // Only allow inline CSS properties that are safe and commonly needed
    // for basic promo-email styling — no `position`, `behavior`, or
    // anything that could be used for tracking/exfiltration tricks.
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'text-align': [/^left$|^right$|^center$/],
        'font-weight': [/^bold$|^\d+$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}
