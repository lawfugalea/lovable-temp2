/* scripts/scrape-smart.js */
const fs = require('fs');
const path = require('path');
const { chromium, request } = require('playwright');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'https://www.smart.com.mt',
};

const FALLBACK_DEPT_NAMES = [
  'Baby','Bakery','Drinks','Food Cupboard','Fresh Food',
  'Frozen Food','General','Health and Beauty','Home','Household','Pets'
];

/* Debug flags (handy while fixing pagination)
   Example: DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 node scripts/scrape-smart.js */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES  = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug');
if (DEBUG_DUMP) ensureDir(dumpDir);

/* ------------------------------ Utils ---------------------------------- */

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function parsePriceToCents(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g, '').replace(',', '.');
  const f = parseFloat(t);
  return Number.isFinite(f) ? Math.round(f * 100) : null;
}

async function ensureStore() {
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function acceptCookies(page) {
  const candidates = [
    'text=Accept All','text=Accept all','text=Accept',
    'button:has-text("Accept")','text=I understand','text=Agree',
    '.cookie-accept','#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(() => {}); await page.waitForTimeout(200); break; }
    } catch {}
  }
}

async function httpProbe(url, proxyUrl) {
  const ctx = await request.newContext({
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  try {
    const r = await ctx.get(url, { timeout: 15000 });
    console.log('HTTP probe', url, '->', r.status());
    return r.ok();
  } catch (e) {
    console.log('HTTP probe failed:', e.message);
    return false;
  } finally {
    await ctx.dispose();
  }
}

/* ------------------------- Grid targeting --------------------------- */

/** Pick the visible gvProducts *main* table (largest area) and derive its base id. */
async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      // DevExpress main table ids usually end with _DXMainTable; strip _DX... to get base
      const baseId = id.replace(/_DX.*$/, ''); // e.g., ctl00_cphNestedMasterPage_gvProducts
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);
  if (!info.length) return null;
  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];
  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerTopSel    = `#${cssEscape(best.baseId + '_DXPagerTop')}`;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  return { baseId: best.baseId, tableSel, pagerTopSel, pagerBottomSel };
}
function cssEscape(s) { return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1'); }

/* ---------- Fast, light “content changed” checks (avoid long waits) -------- */

async function gridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, t => (t.innerText || '').slice(0, 1500)).catch(() => '');
}
async function waitGridChanged(page, tableSel, oldSig, timeout = 3000) {
  if (!tableSel) return false;
  return await page.waitForFunction((sel, prev) => {
    const t = document.querySelector(sel);
    if (!t) return false;
    const sig = (t.innerText || '').slice(0, 1500);
    return sig && sig !== prev;
  }, tableSel, oldSig, { timeout }).then(() => true).catch(() => false);
}

async function readPagerInfo(page, pagerSel) {
  const curFromSpan = await page.$eval(pagerSel, root => {
    const cur = root.querySelector('span.dxp-current, [aria-current="page"]');
    return cur ? (cur.textContent || '').trim() : '';
  }).catch(() => '');
  let cur = parseInt(curFromSpan, 10);

  if (!Number.isFinite(cur)) {
    const summary = await page.$eval(pagerSel, root => {
      const s = root.querySelector('.dxp-summary, .dxp-lead');
      return s ? (s.textContent || '').trim() : '';
    }).catch(() => '');
    const m = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(summary);
    if (m) cur = parseInt(m[1], 10);
  }

  const totalTxt = await page.$eval(pagerSel, root => {
    const s = root.querySelector('.dxp-summary, .dxp-lead');
    return s ? (s.textContent || '').trim() : '';
  }).catch(() => '');
  const m2 = /Page\s+\d+\s+of\s+(\d+)/i.exec(totalTxt);
  const total = m2 ? parseInt(m2[1], 10) : null;

  return { cur: Number.isFinite(cur) ? cur : null, total };
}

async function waitPagerIncrement(page, pagerSel, prev, timeout = 1200) {
  if (prev == null) return false;
  return await page.waitForFunction((sel, p) => {
    const r = document.querySelector(sel);
    if (!r) return false;
    const curEl = r.querySelector('span.dxp-current, [aria-current="page"]');
    if (curEl) {
      const n = parseInt((curEl.textContent || '').trim(), 10);
      return Number.isFinite(n) && n > p;
    }
    const sEl = r.querySelector('.dxp-summary, .dxp-lead');
    if (sEl) {
      const m = /Page\s+(\d+)\s+of\s+\d+/.exec(sEl.textContent || '');
      if (m) {
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) && n > p;
      }
    }
    return false;
  }, pagerSel, prev, { timeout }).then(() => true).catch(() => false);
}

/* ----------------------- Pager interaction (fast path) -------------------- */
/** Use DevExpress EndCallback token (fast), then tiny fallbacks. */
async function goNextPage(page, ctx) {
  if (!ctx) return false;
  const { baseId, tableSel, pagerTopSel, pagerBottomSel } = ctx;

  let { cur } = await readPagerInfo(page, pagerTopSel);
  if (cur == null) ({ cur } = await readPagerInfo(page, pagerBottomSel));
  if (cur == null) { console.log('Pager: cannot read current page'); return false; }

  const beforeSig = await gridSignature(page, tableSel);
  const token = `__dx_end_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const t0 = Date.now();
  const fired = await page.evaluate(({ gridId, cur, token }) => {
    const getClient = () => {
      const direct = window[gridId];
      if (direct) return direct;
      try {
        if (window.ASPx && ASPx.GetControlCollection) {
          return ASPx.GetControlCollection().GetByName(gridId) || null;
        }
      } catch {}
      return null;
    };
    const gv = getClient();
    if (!gv) return { ok:false, why:'no client object' };

    // one-shot end callback -> mark window[token] = 'done'
    const handler = function onEnd() {
      try { gv.EndCallback && gv.EndCallback.RemoveHandler(onEnd); } catch {}
      window[token] = 'done';
    };
    try {
      if (gv.EndCallback && gv.EndCallback.AddHandler) gv.EndCallback.AddHandler(handler);
    } catch {}

    try {
      if (typeof gv.GotoPage === 'function') {
        // DevExpress: zero-based page index -> if cur=1, next PN1 (page 2)
        gv.GotoPage(cur);
      } else if (typeof gv.PerformCallback === 'function') {
        gv.PerformCallback('PN' + cur);
      } else if (typeof window.aspxGVPagerOnClick === 'function') {
        window.aspxGVPagerOnClick(gridId, 'PN' + cur);
      } else {
        return { ok:false, why:'no pager method' };
      }
      return { ok:true };
    } catch (e) {
      return { ok:false, why:String(e) };
    }
  }, { gridId: baseId, cur, token });

  if (!fired.ok) { console.log('Pager fire failed:', fired.why); return false; }

  // Fast path: wait for EndCallback token (up to 2s)
  const endHit = await page
    .waitForFunction(tok => window[tok] === 'done', token, { timeout: 2000 })
    .then(() => true).catch(() => false);

  let advanced = endHit;
  if (!advanced) {
    // Tiny fallback: page number increment (top/bottom), then minimal content change
    const incTop = await waitPagerIncrement(page, pagerTopSel, cur, 1200);
    const incBot = incTop ? true : await waitPagerIncrement(page, pagerBottomSel, cur, 1200);
    advanced = incTop || incBot;
    if (!advanced) {
      advanced = await waitGridChanged(page, tableSel, beforeSig, 1500);
    }
  }

  console.log(`Pager flip ${advanced ? 'OK' : 'FAILED'} in ${Date.now() - t0}ms (from ${cur} -> ${cur + 1})`);
  return advanced;
}

/* --------------------------- Discovery / parse --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(), href: a.href
  })).filter(x => x.href && x.href.startsWith('http')));
  const nameSet = new Set(FALLBACK_DEPT_NAMES.map(n => n.toLowerCase()));
  const links = anchors.filter(a => {
    const t = normalizeName(a.text);
    const isDeptText = nameSet.has(t);
    const looksLikeCat = /(category|categories|department|products|departmentid|cat|dept|groceries)/i.test(a.href) || /Products\.aspx/i.test(a.href);
    return isDeptText || looksLikeCat;
  });

  const seen = new Set();
  const cleaned = [];
  for (const l of links) {
    try {
      const u = new URL(l.href);
      const key = u.origin + u.pathname + u.search;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({
          name: l.text || u.search.slice(1) || u.pathname.split('/').filter(Boolean).pop() || 'Department',
          href: u.toString(),
        });
      }
    } catch {}
  }

  const filtered = cleaned.filter(l => !/(account|login|cart|checkout|about|contact)/i.test(l.href));
  const uniq = [];
  const seenHref = new Set();
  for (const l of filtered) {
    if (!seenHref.has(l.href)) { uniq.push(l); seenHref.add(l.href); }
  }

  const strong = uniq.filter(l => /(department|category|products)/i.test(l.href));
  const final = strong.length ? strong : uniq;

  return final
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER))
    .slice(0, 80);
}

/** Change to 50 per page; wait for the grid to actually update (signature), not networkidle. */
async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;

    // capture current grid signature (if any) to confirm change
    const ctxBefore = await getGridContext(page);
    const sigBefore = ctxBefore?.tableSel ? await gridSignature(page, ctxBefore.tableSel) : '';

    try {
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const opt = opts.find(o => o.value === '50') || opts.find(o => /50/.test(o.textContent || ''));
        if (!opt) return false;
        node.value = opt.value;
        return true;
      }).catch(() => false);
      if (!picked) continue;

      const onchange = await el.getAttribute('onchange').catch(() => null);
      if (onchange && /__doPostBack/.test(onchange)) {
        await page.evaluate((sel) => {
          const node = document.querySelector(sel);
          if (!node) return;
          if (typeof window.__doPostBack === 'function') {
            const name = node.name || node.id || '';
            window.__doPostBack(name, '');
          } else {
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, sel);
      } else {
        await page.selectOption(sel, { label: '50' }).catch(() => {});
        await page.selectOption(sel, { value: '50' }).catch(() => {});
      }

      // wait for the grid’s content to update (fast)
      const ctxAfter = await getGridContext(page);
      const selAfter = ctxAfter?.tableSel || ctxBefore?.tableSel;
      const changed = await waitGridChanged(page, selAfter, sigBefore, 2000);
      if (changed) {
        console.log('ItemsPerPage => 50 (grid updated)');
        return true;
      }
    } catch {}
  }
  return false;
}

async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => el && el.offsetParent !== null; // cheap & sufficient
    const stripScripts = (root) => {
      root.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return root;
    };
    const textFrom = (el) => {
      const clone = el.cloneNode(true);
      stripScripts(clone);
      return (clone.innerText || '').replace(/\s+/g, ' ').trim();
    };

    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return [];

    // Skip header (first) and pager (last) rows
    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);

    const out = [];
    for (const row of dataRows) {
      if (!visible(row)) continue;

      const tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 2) continue;

      const rowText = textFrom(row);
      if (!/€\s*\d/.test(rowText)) continue;

      const imgEl = row.querySelector('img');
      const imgAlt = imgEl?.getAttribute('alt')?.trim() || '';

      let name = '';
      const nameCandidates = Array.from(row.querySelectorAll('td a, td span, td div'))
        .filter((n) =>
          visible(n) &&
          !n.querySelector('img') &&
          !/add|basket|cart|button|qty|quantity/i.test(n.className || '') &&
          (n.innerText || '').trim().length > 1
        )
        .map((n) => (n.innerText || '').trim());
      name = nameCandidates.find((t) => !/€\s*\d/.test(t)) || imgAlt;
      if (!name) {
        name = rowText.replace(/€\s*\d[\d\.,]*/g, '').trim();
        if (name.length > 120) name = name.slice(0, 120);
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name || name === 'Items per page:') continue;

      // Price
      let priceStr = '';
      const tdTexts = tds.map((td) => textFrom(td));
      for (const tx of tdTexts) {
        const m = tx.match(/€\s*\d[\d\.,]*/);
        if (m) { priceStr = m[0]; break; }
      }
      if (!priceStr) continue;

      // Unit
      let unit = '';
      const unitEl = row.querySelector('small, .unit, .size');
      if (unitEl) unit = (unitEl.innerText || '').trim();
      if (!unit) {
        const m = rowText.match(/(?:per|\/)\s*[A-Za-z]+|[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets)/i);
        if (m) unit = m[0].trim();
      }
      if (/items per page/i.test(unit)) unit = '';

      // Link
      let link = '';
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      link = linkEl?.href || '';

      const image =
        imgEl?.getAttribute('src') ||
        imgEl?.getAttribute('data-src') ||
        imgEl?.getAttribute('srcset') ||
        '';

      const brand = (name.split(/\s+/).find((w) => !/\d/.test(w)) || '') || '';

      out.push({ name, price: priceStr, unit, link, image, brand });
    }
    return out;
  });

  console.log(`Parsed ${products.length} product rows`);
  return products;
}

/* ------------------------------- DB upsert -------------------------------- */

async function upsertProductOffer(store, p, sourceUrl, category) {
  const cents = parsePriceToCents(p.price);
  if (cents == null) return false;

  if (process.env.DRYRUN) {
    console.log(`[DRYRUN] ${category} :: ${p.name} — ${p.price} ${p.unit || ''}`);
    return true;
  }

  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const product = await prisma.priceProduct.upsert({
        where: { sourceUrl },
        update: {
          name: p.name,
          brand: p.brand || null,
          imageUrl: p.image || null,
          nameNormalized: normalizeName(p.name),
          storeId: store.id,
        },
        create: {
          storeId: store.id,
          name: p.name,
          brand: p.brand || null,
          sourceUrl,
          imageUrl: p.image || null,
          nameNormalized: normalizeName(p.name),
        },
      });
      await prisma.priceOffer.create({
        data: {
          productId: product.id,
          priceCents: cents,
          unit: p.unit || null,
          category: category || null,
        },
      });
      return true;
    } catch (e) {
      attempts++;
      console.warn(`Upsert failed (attempt ${attempts}/${maxAttempts}):`, e.message);
      if (e.code === 'P1017') {
        await prisma.$disconnect().catch(() => {});
        await prisma.$connect().catch(() => {});
        await new Promise(r => setTimeout(r, 1000 * attempts));
      } else {
        throw e;
      }
      if (attempts === maxAttempts) {
        console.error('Max retries reached for upsert.');
        return false;
      }
    }
  }
  return false;
}

/* --------------------------------- Main ----------------------------------- */

async function run() {
  console.log('▶️ Starting Smart scraper…');
  if (!process.env.DATABASE_URL && !process.env.DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for no-DB test)');
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const reachable = await httpProbe(STORE.baseUrl.replace('https://', 'http://'), proxyUrl);
  if (!reachable) {
    console.error('❌ Not reachable. Fix proxy/DNS or run from a VM that can reach the site.');
    return;
  }

  const store = await ensureStore();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HouseflowScraper/1.0 Chrome/120 Safari/537.36',
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });

  /* 🚀 BIG SPEED WIN: block heavy resources globally */
  await context.route('**/*', (route) => {
    const r = route.request();
    const type = r.resourceType();
    const url = r.url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      /\.woff2?$|\.ttf$|\.otf$|\.png$|\.jpe?g$|\.gif$|\.webp$|\.mp4$|\.avi$/i.test(url) ||
      /google-analytics\.com|gtag\/js|googletagmanager\.com|facebook\.com\/tr|hotjar\.com|doubleclick\.net/i.test(url)
    ) return route.abort();
    return route.continue();
  });

  const page = await context.newPage();

  console.log('🌐 Opening home…', STORE.baseUrl.replace('https://', 'http://'));
  try {
    await page.goto(STORE.baseUrl.replace('https://', 'http://'), { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    await page.goto(STORE.baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }
  await acceptCookies(page);
  await page.waitForTimeout(400);

  let deptQueue = await discoverDepartmentLinks(page);
  console.log('📂 Initial Departments:', deptQueue.map(d => d.name).join(', ') || '(none)');
  const seenHref = new Set(deptQueue.map(d => d.href));

  let totalProducts = 0;
  let totalOffers = 0;

  while (deptQueue.length) {
    const dept = deptQueue.shift();
    const categoryPath = dept.name;
    console.log(`\n📁 Processing: ${categoryPath} (${dept.href})`);

    try {
      await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 }); // lighter than networkidle
    } catch (e) {
      console.warn(`⚠️ Could not open ${dept.href}: ${e.message}`);
      continue;
    }
    await acceptCookies(page);
    await setItemsPerPage(page);

    // Log pager summary (handy for debugging)
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerTopSel || ctx0?.pagerBottomSel) {
        const sel = (ctx0.pagerTopSel || '') + (ctx0.pagerBottomSel ? `, ${ctx0.pagerBottomSel}` : '');
        const summary = await page.$eval(sel, el => (el.textContent || '').trim()).catch(() => null);
        if (summary) console.log('Pager text:', summary);
      }
    } catch {}

    let pageNum = 1;

    for (;;) {
      try {
        const ctx = await getGridContext(page);
        if (!ctx?.tableSel) {
          if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
          console.log('⚠️ No product grid detected; dumped HTML for inspection.');
          break;
        }

        const items = await collectProductsOnPage(page, ctx);
        console.log(`🧾 Page ${pageNum}: found ${items.length} items`);
        if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);

        for (const p of items) {
          const sourceUrl = p.link || `${page.url()}#${normalizeName(p.name)}`;
          const ok = await upsertProductOffer(store, p, sourceUrl, categoryPath);
          if (ok) {
            totalProducts++;
            totalOffers++;
            console.log(`• ${p.name} — ${p.price}${p.unit ? ' (' + p.unit + ')' : ''}`);
          }
        }

        if (MAX_PAGES && pageNum >= MAX_PAGES) break;

        const advanced = await goNextPage(page, ctx);
        if (!advanced) break;

        pageNum++;
      } catch (e) {
        console.error(`Error processing page ${pageNum} in ${categoryPath}:`, e.message);
        break;
      }
    }

    // Discover sub-departments after each category
    try {
      const subLinks = await discoverDepartmentLinks(page);
      for (const sub of subLinks) {
        if (!seenHref.has(sub.href) && seenHref.size < 500) {
          seenHref.add(sub.href);
          deptQueue.push(sub);
        }
      }
    } catch (e) {
      console.warn('Failed to discover sub-links for ' + categoryPath + ': ' + e.message);
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
}

/* ------------------------------ Debug helpers ------------------------------ */
async function dumpDebug(page, category, pageNum, ctx) {
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g, '_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true }).catch(() => {});
    if (ctx?.tableSel) {
      const tableHtml = await page.$eval(ctx.tableSel, n => n.outerHTML).catch(() => null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
    if (ctx?.pagerTopSel || ctx?.pagerBottomSel) {
      const sel = (ctx.pagerTopSel || '') + (ctx.pagerBottomSel ? `, ${ctx.pagerBottomSel}` : '');
      const pagerHtml = await page.$eval(sel, n => n.outerHTML).catch(() => null);
      if (pagerHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_pager.html`), pagerHtml);
    }
  } catch {}
}

/* --------------------------------- Runner ---------------------------------- */
run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
