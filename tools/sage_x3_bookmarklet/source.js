/**
 * PresenceCamions — Bookmarklet d'extraction Commandes ADV depuis Sage X3 Web (Syracuse)
 * v2 — support iframes Syracuse + scan générique renforcé
 */

(function () {
  'use strict';

  var OVERLAY_ID = '__pc_sage_adv__';

  var existing = document.getElementById(OVERLAY_ID);
  if (existing) { existing.remove(); return; }

  /* ── Utilitaires ─────────────────────────────────────────────────────── */
  function getText(el) {
    return (el ? (el.innerText || el.textContent) : '').replace(/\s+/g, ' ').trim();
  }

  function convertDate(raw) {
    raw = (raw || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var m = raw.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
    if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    // Format Sage X3 court : 14/03/26 → 2026-03-14
    var m2 = raw.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2})$/);
    if (m2) return '20' + m2[3] + '-' + ('0' + m2[2]).slice(-2) + '-' + ('0' + m2[1]).slice(-2);
    return raw;
  }

  function normTonnage(raw) {
    raw = (raw || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!raw) return '';
    if (/^\d+[,.]?\d*\s*T$/.test(raw)) return raw.replace(',', '.');
    var n = parseFloat(raw.replace(',', '.'));
    if (!isNaN(n) && n > 0) return n + 'T';
    return raw;
  }

  function escCsv(v) {
    v = String(v || '');
    return (v.includes(';') || v.includes('"') || v.includes('\n'))
      ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  /* ── Suppression des doublons consécutifs (Syracuse duplique chaque cellule) ── */
  function dedupeRow(row) {
    var out = [];
    for (var i = 0; i < row.length; i++) {
      if (i === 0 || row[i] !== row[i - 1]) out.push(row[i]);
    }
    return out;
  }

  /* ── Collecte de tous les documents accessibles (page + iframes) ──────── */
  function getAllDocs() {
    var docs = [document];
    try {
      var frames = document.querySelectorAll('iframe');
      frames.forEach(function(f) {
        try {
          var d = f.contentDocument || (f.contentWindow && f.contentWindow.document);
          if (d && d.body) docs.push(d);
        } catch(e) {}
      });
    } catch(e) {}
    return docs;
  }

  /* ── Extraction dans un document donné ───────────────────────────────── */
  function extractFromDoc(doc) {
    var headers = [];
    var rows    = [];

    /* Stratégie 1 : ARIA roles */
    var ariaHdr  = doc.querySelectorAll('[role="columnheader"]');
    var ariaRows = doc.querySelectorAll('[role="row"], [role="gridrow"]');
    if (ariaHdr.length > 0) {
      ariaHdr.forEach(function(h) { var t = getText(h); if (t) headers.push(t); });
    }
    if (ariaRows.length > 0) {
      ariaRows.forEach(function(row) {
        if (row.querySelector('[role="columnheader"]')) return;
        var cells = row.querySelectorAll('[role="gridcell"], [role="cell"]');
        if (cells.length === 0) cells = row.querySelectorAll('td');
        if (cells.length === 0) return;
        var r = dedupeRow(Array.from(cells).map(function(c) { return getText(c); }));
        if (r.some(function(v) { return v; })) rows.push(r);
      });
      if (rows.length > 0) return { headers: headers, rows: rows };
    }

    /* Stratégie 2 : Classes Sage X3 / Syracuse */
    var sageRowSels = [
      '[class*="list-row"]:not([class*="header"])',
      '[class*="adv-row"]',
      '[class*="x3-row"]',
      '[class*="sc-row"]',
      '[class*="grid-row"]',
      '.obj-list .obj-row',
      '.list-body [class*="row"]',
      '.scroller-body [class*="row"]',
      '[class*="LISTBODY"] [class*="row"]'
    ];
    var sageHdrSels = [
      '[class*="list-hdr"] [class*="col"]',
      '[class*="list-header"] [class*="col"]',
      '[class*="grid-header"] [class*="col"]',
      '[class*="adv-hdr"] span',
      '.obj-hdr [class*="col"]'
    ];

    if (headers.length === 0) {
      for (var hi = 0; hi < sageHdrSels.length; hi++) {
        var hEls = doc.querySelectorAll(sageHdrSels[hi]);
        if (hEls.length > 1) {
          hEls.forEach(function(h) { var t = getText(h); if (t) headers.push(t); });
          break;
        }
      }
    }

    for (var ri = 0; ri < sageRowSels.length; ri++) {
      var rowEls = doc.querySelectorAll(sageRowSels[ri]);
      if (rowEls.length === 0) continue;
      rowEls.forEach(function(rowEl) {
        var cells = rowEl.querySelectorAll('[class*="cell"], [class*="val"], [class*="col"]:not([class*="header"])');
        if (cells.length === 0) cells = rowEl.querySelectorAll('span, td');
        if (cells.length === 0) cells = rowEl.children;
        var r = dedupeRow(Array.from(cells).map(function(c) { return getText(c); }).filter(function(v) { return v; }));
        if (r.length >= 2) rows.push(r);
      });
      if (rows.length > 0) return { headers: headers, rows: rows };
    }

    /* Stratégie 3 : Tableau HTML classique */
    var tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      var best = null, bestN = 0;
      tables.forEach(function(t) {
        var n = t.querySelectorAll('tbody tr').length;
        if (n > bestN) { bestN = n; best = t; }
      });
      if (best && bestN > 0) {
        best.querySelectorAll('thead th, thead td').forEach(function(h) {
          var t = getText(h); if (t) headers.push(t);
        });
        best.querySelectorAll('tbody tr').forEach(function(tr) {
          var r = dedupeRow(Array.from(tr.querySelectorAll('td')).map(function(c) { return getText(c); }));
          if (r.some(function(v) { return v; })) rows.push(r);
        });
        if (rows.length > 0) return { headers: headers, rows: rows };
      }
    }

    /* Stratégie 4 : Scan générique — divs avec ≥4 enfants textuels (Syracuse) */
    var candidates = doc.querySelectorAll('div, ul');
    var rowMap = {};
    candidates.forEach(function(el) {
      var children = Array.from(el.children);
      if (children.length < 3) return;
      var texts = children.map(function(c) { return getText(c); }).filter(function(v) { return v && v.length < 120; });
      if (texts.length >= 3 && texts.some(function(v) { return v; })) {
        var parentKey = (el.parentElement || el).className || 'root';
        if (!rowMap[parentKey]) rowMap[parentKey] = [];
        rowMap[parentKey].push(texts);
      }
    });
    var bestGroup = null, bestGroupLen = 0;
    Object.keys(rowMap).forEach(function(k) {
      if (rowMap[k].length > bestGroupLen) {
        bestGroupLen = rowMap[k].length;
        bestGroup = rowMap[k];
      }
    });
    if (bestGroup && bestGroup.length > 1) {
      return { headers: [], rows: bestGroup };
    }

    return null;
  }

  /* ── Recherche dans tous les documents (page principale + iframes) ───── */
  function extractGrid() {
    var docs = getAllDocs();
    for (var d = 0; d < docs.length; d++) {
      var result = extractFromDoc(docs[d]);
      if (result && result.rows.length > 0) return result;
    }
    return { headers: [], rows: [] };
  }

  /* ── Détection automatique des colonnes ──────────────────────────────── */
  function autoDetect(headers, fieldKey) {
    var patterns = {
      client:      /client|tiers|bpc|raison\s*soc|acheteur|rais/i,
      destination: /livr|destin|adresse|ville|site.*liv|lieu|ship/i,
      tonnage:     /tonn|quant|qt[eé]|poids|kg\b|volume|qte/i,
      date:        /date.*livr|livr.*date|shidat|dat.*exp|expéd|date\s*liv|date.*com/i,
      transport:   /transport|mode.*transp|type.*transp|acheminement/i
    };
    var pat = patterns[fieldKey];
    if (!pat || !headers || !headers.length) return '';
    for (var i = 0; i < headers.length; i++) {
      if (pat.test(headers[i])) return String(i);
    }
    return '';
  }

  /* ── Génération CSV ───────────────────────────────────────────────────── */
  function buildCsv(rows, map, transportDefault) {
    var lines = ['client;destination;tonnage;dateLivraison;typeTransport'];
    var count = 0;
    rows.forEach(function(row) {
      var client      = map.client      !== null ? (row[map.client]      || '') : '';
      var destination = map.destination !== null ? (row[map.destination] || '') : '';
      var tonnage     = map.tonnage     !== null ? (row[map.tonnage]     || '') : '';
      var date        = map.date        !== null ? (row[map.date]        || '') : '';
      var transport   = map.transport   !== null ? (row[map.transport]   || '') : transportDefault;
      if (!client.trim() && !destination.trim()) return;
      transport = transport.trim().toUpperCase() === 'LOCATION' ? 'Location' : (transport.trim() || transportDefault);
      lines.push([client, destination, normTonnage(tonnage), convertDate(date), transport].map(escCsv).join(';'));
      count++;
    });
    return { csv: '\uFEFF' + lines.join('\r\n'), count: count };
  }

  /* ── Interface ───────────────────────────────────────────────────────── */
  var grid    = extractGrid();
  var hasData = grid.rows.length > 0;
  var numCols = hasData ? Math.max.apply(null, grid.rows.map(function(r) { return r.length; })) : 0;

  var fields = [
    { key: 'client',      label: 'Client',        hint: 'Raison sociale / code tiers' },
    { key: 'destination', label: 'Destination',   hint: 'Adresse ou ville de livraison' },
    { key: 'tonnage',     label: 'Tonnage / Qté', hint: 'Quantité commandée' },
    { key: 'date',        label: 'Date livraison',hint: 'Date livraison prévue' },
    { key: 'transport',   label: 'Type transport',hint: 'Mode de transport (optionnel)' }
  ];

  function buildColOptions(headers, numCols, detected) {
    var html = '<option value="">-- ignorer --</option>';
    var count = headers.length > 0 ? headers.length : numCols;
    for (var i = 0; i < count; i++) {
      var lbl = headers.length > 0 ? ('Col ' + (i+1) + ' \u2014 ' + headers[i]) : ('Colonne ' + (i+1));
      var sel = String(i) === String(detected) ? ' selected' : '';
      html += '<option value="' + i + '"' + sel + '>' + lbl + '</option>';
    }
    return html;
  }

  var previewText = '';
  if (hasData) {
    if (grid.headers.length > 0) previewText += 'En-têtes : ' + grid.headers.join(' | ') + '\n';
    grid.rows.slice(0, 3).forEach(function(r, i) {
      previewText += 'Ligne ' + (i+1) + '  : ' + r.join(' | ') + '\n';
    });
    if (grid.rows.length > 3) previewText += '... (' + grid.rows.length + ' lignes au total)';
  }

  var mappingHtml = fields.map(function(f) {
    var detected = autoDetect(grid.headers, f.key);
    return [
      '<div style="margin-bottom:10px;">',
      '<label style="display:block;font-size:12px;font-weight:600;color:#4A5568;margin-bottom:3px;">',
      f.label + ' <span style="font-weight:normal;color:#8A9BB0;">\u2014 ' + f.hint + '</span></label>',
      '<select id="__pc_' + f.key + '" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;background:#fff;">',
      buildColOptions(grid.headers, numCols, detected),
      '</select></div>'
    ].join('');
  }).join('');

  var bodyHtml = hasData ? [
    '<div style="background:#e8f4fd;border:1px solid #bee3f8;border-radius:5px;padding:8px 12px;font-size:12px;color:#1565C0;margin-bottom:10px;">',
    '\u2713 <b>' + grid.rows.length + '</b> ligne(s) d\u00e9tect\u00e9e(s). Mappez les colonnes, puis cliquez sur T\u00e9l\u00e9charger.</div>',
    '<pre style="background:#f5f5f5;border-radius:4px;padding:8px 10px;font-size:11px;max-height:80px;overflow:auto;margin:0 0 14px;white-space:pre-wrap;word-break:break-all;">',
    previewText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
    '</pre>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
    mappingHtml,
    '</div>',
    '<label style="display:block;font-size:12px;font-weight:600;color:#4A5568;margin-bottom:3px;">Transport par d\u00e9faut</label>',
    '<select id="__pc_transport_default" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;background:#fff;margin-bottom:16px;">',
    '<option value="Location">Location</option><option value="LUI-MEME">LUI-MEME</option>',
    '</select>',
    '<div style="display:flex;gap:10px;">',
    '<button id="__pc_export" style="flex:1;padding:10px 0;background:#D4A843;color:#0A1628;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:700;">\u2b07 T\u00e9l\u00e9charger CSV</button>',
    '<button id="__pc_close" style="padding:10px 18px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Annuler</button>',
    '</div>'
  ].join('') : [
    '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:5px;padding:12px;color:#856404;margin-bottom:16px;">',
    '<b>\u26a0 Aucune donn\u00e9e trouv\u00e9e.</b><br><br>',
    'V\u00e9rifiez que vous \u00eates sur la <b>liste des commandes de vente</b> (Ventes &rarr; Commandes), ',
    'que la liste est bien affich\u00e9e \u00e0 gauche de l\u2019\u00e9cran, puis relancez le bookmarklet.<br><br>',
    '<b>Alternative :</b> ouvrez la console navigateur (<kbd>F12</kbd> &rarr; Console) et collez le code de <code>source.js</code>.',
    '</div>',
    '<button id="__pc_close" style="padding:9px 20px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Fermer</button>'
  ].join('');

  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,22,40,0.82);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:14px;';
  overlay.innerHTML = [
    '<div style="background:#fff;border-radius:8px;padding:24px;max-width:680px;width:92vw;max-height:88vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.5);">',
    '<h2 style="margin:0 0 14px;color:#0A1628;font-size:17px;border-bottom:2px solid #D4A843;padding-bottom:8px;">\ud83d\udce6 Extraction Commandes ADV \u2014 Sage X3</h2>',
    bodyHtml,
    '</div>'
  ].join('');

  document.body.appendChild(overlay);

  document.getElementById('__pc_close').onclick = function() { overlay.remove(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  var exportBtn = document.getElementById('__pc_export');
  if (exportBtn) {
    exportBtn.onclick = function() {
      var map = {};
      fields.forEach(function(f) {
        var sel = document.getElementById('__pc_' + f.key);
        map[f.key] = (sel && sel.value !== '') ? parseInt(sel.value, 10) : null;
      });
      var transportDefault = document.getElementById('__pc_transport_default').value;
      var result = buildCsv(grid.rows, map, transportDefault);
      if (result.count === 0) {
        alert('\u26a0 Aucune ligne export\u00e9e.\nV\u00e9rifiez le mapping (Client et Destination obligatoires).');
        return;
      }
      var blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href   = url;
      a.download = 'commandes_adv_' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      overlay.remove();
      alert('\u2713 ' + result.count + ' commande(s) export\u00e9e(s).\n\nTransf\u00e9rez le fichier CSV sur Android et importez-le dans PresenceCamions.');
    };
  }

})();
