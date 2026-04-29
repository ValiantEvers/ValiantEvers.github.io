// utils.js — shared constants and helpers

window.TAG_TAXONOMY = {
  'asymmetric-info':    'Asymmetric Info',
  'bank-models':        'Bank Models',
  'credit-risk':        'Credit Risk',
  'deposit-insurance':  'Deposit Insurance',
  'bank-crises':        'Bank Crises',
  'bank-regulation':    'Regulation',
  'derivatives-fx':     'Derivatives & FX',
  'securitisation':     'Securitisation',
  'recovery-resolution':'Recovery & Resolution',
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
