// utils.js – shared constants and helpers

window.TAG_TAXONOMY = {
  'asymmetric-info':    'Asymmetric Info',
  'bank-models':        'Bank Models / QAT',
  'bank-balance-sheets':'Bank Balance Sheets',
  'credit-risk':        'Credit Risk / IFRS 9',
  'liquidity-risk':     'Liquidity Risk',
  'deposit-insurance':  'Deposit Insurance',
  'bank-crises':        'Bank Crises',
  'bank-regulation':    'Basel / Regulation',
  'derivatives-fx':     'Derivatives & FX',
  'securitisation':     'Securitisation',
  'recovery-resolution':'Recovery & Resolution',
  'esg':                'ESG / Climate',
  'foundational-models':'Foundational Models',
  'case-studies':       'Case Studies',
};

window.tagLabel = function(tag) {
  return window.TAG_TAXONOMY[tag] || tag;
};

window.formatDate = function(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

window.formatDateShort = function(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

// Simple markdown-ish renderer: handles **bold** and \n\n paragraphs
window.renderWalkthrough = function(text) {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map(para => {
      const html = para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return '<p>' + html + '</p>';
    })
    .join('');
};

// Escape HTML special characters in user content before re-injecting structured tags
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inline replacements applied after escaping: **bold**, `code`
function inlineMd(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// Richer markdown renderer for topic bodies: paragraphs, bullet lists, GitHub-flavoured tables
window.renderMarkdown = function(text) {
  if (!text) return '';
  const blocks = String(text).split(/\n\n+/);

  return blocks.map(block => {
    const lines = block.split('\n');
    const escapedLines = lines.map(escHtml);

    // Detect a markdown table: line 1 contains pipes, line 2 is a separator like |---|---|
    if (escapedLines.length >= 2 &&
        /\|/.test(escapedLines[0]) &&
        /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(escapedLines[1])) {
      const header = escapedLines[0].replace(/^\s*\|?|\|?\s*$/g, '').split('|').map(c => c.trim());
      const rows = escapedLines.slice(2).map(r =>
        r.replace(/^\s*\|?|\|?\s*$/g, '').split('|').map(c => inlineMd(c.trim()))
      );
      const thead = '<tr>' + header.map(h => '<th>' + inlineMd(h) + '</th>').join('') + '</tr>';
      const tbody = rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('');
      return '<table class="md-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>';
    }

    // Detect a bullet list: lines starting with • or - or *
    const bulletRe = /^\s*[•\-\*]\s+(.+)$/;
    if (escapedLines.every(l => l.trim() === '' || bulletRe.test(l))) {
      const items = escapedLines.filter(l => l.trim() !== '').map(l => {
        const m = l.match(bulletRe);
        return '<li>' + inlineMd(m[1]) + '</li>';
      }).join('');
      return '<ul class="md-list">' + items + '</ul>';
    }

    // Detect a numbered list: 1. 2. 3.
    const numRe = /^\s*\d+\.\s+(.+)$/;
    if (escapedLines.every(l => l.trim() === '' || numRe.test(l))) {
      const items = escapedLines.filter(l => l.trim() !== '').map(l => {
        const m = l.match(numRe);
        return '<li>' + inlineMd(m[1]) + '</li>';
      }).join('');
      return '<ol class="md-list">' + items + '</ol>';
    }

    // Default – paragraph; allow soft <br/> on lone newlines
    return '<p>' + inlineMd(escapedLines.join('<br/>')) + '</p>';
  }).join('');
};

// localStorage helpers
window.lsGet = function(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

window.lsSet = function(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
