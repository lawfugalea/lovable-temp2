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

/* ---------- Debug & control flags (useful while fixing pagination) ---------- */
/* Examples:
 *   DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 node scripts/scrape-smart.js
 */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();       // filter departments by name
const MAX_PAGES  = parseInt(process.env.MAX_PAGES || '0', 10) || 0;    // cap pages per department (0 = no cap)
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;                            // dump HTML+screenshots to ./smart_debug

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug');
if (DEBUG_DUMP) ensureDir(dumpDir);

/* ------------------------------ Utilities ---------------------------------- */

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
    update: { name: STORE.name, slug: 'smart', sourceType: 'PUBLIC_HTML' },
    create: { name: STORE.name, slug: 'smart', domain: STORE.domain, sourceType: 'PUBLIC_HTML' },
  });
}

async function acceptCookies(page) {
  const candidates = [
    'text=Accept All', 'text=Accept all', 'text=Accept',
    'button:has-text("Accept")', 'text=I understand', 'text=Agree',
    '.cookie-accept', '#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click().catch(() => {});
        await page.waitForTimeout(400);
        break;
      }
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

/* ------------------------- Grid targeting helpers -------------------------- */

/** Choose the visible gvProducts *main* table (largest area), derive its base id. */
async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      // DevExpress main table ids typically end with _DXMainTable; strip _DX... to get base
      const baseId = id.replace(/_DX.*$/, ''); // e.g., ctl00_cphNestedMasterPage_gvProducts
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);

  if (!info.length) return null;

  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];

  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  const pagerTopSel    = `#${cssEscape(best.baseId + '_DXPagerTop')}`;

  return { tableSel, baseId: best.baseId, pagerSel: `${pagerBottomSel}, ${pagerTopSel}` };
}

function cssEscape(s) {
  return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

async function readPagerInfo(page, pagerSel) {
  // read current page: prefer span.dxp-current, fallback to summary "Page X of Y"
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

  const totalMatch = await page.$eval(pagerSel, root => {
    const s = root.querySelector('.dxp-summary, .dxp-lead');
    return s ? (s.textContent || '').trim() : '';
  }).catch(() => '');
  const m2 = /Page\s+\d+\s+of\s+(\d+)/i.exec(totalMatch);
  const total = m2 ? parseInt(m2[1], 10) : null;

  return { cur: Number.isFinite(cur) ? cur : null, total };
}

async function getGridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, t => (t.innerText || '').slice(0, 4000)).catch(() => '');
}

async function waitGridChangeBySig(page, tableSel, oldSig) {
  if (!tableSel) return;
  await page.waitForFunction((sel, prev) => {
    const t = document.querySelector(sel);
    if (!t) return false;
    const sig = (t.innerText || '').slice(0, 4000);
    return sig && sig !== prev;
  }, tableSel, oldSig, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);
}

/* ---------------------------- Pager interaction ---------------------------- */

/** Call DevExpress pager for this grid; verify page number or content changed. */
async function clickNextForThisGrid(page, ctx) {
  if (!ctx) return false;
  const { baseId, tableSel } = ctx;

  const topSel    = `#${cssEscape(baseId + '_DXPagerTop')}`;
  const bottomSel = `#${cssEscape(baseId + '_DXPagerBottom')}`;

  let { cur } = await readPagerInfo(page, topSel);
  if (cur == null) ({ cur } = await readPagerInfo(page, bottomSel));
  if (cur == null) return false;

  const beforeSig = await getGridSignature(page, tableSel);

  // Prefer invoking DevExpress' official pager hook
  const invoked = await page.evaluate(({ gridId, cur }) => {
    const nextIndex = cur; // PN index is 0-based; if cur=1, next is PN1
    const arg = 'PN' + nextIndex; // PageNumber(nextIndex)
    if (typeof window.aspxGVPagerOnClick === 'function') {
      window.aspxGVPagerOnClick(gridId, arg);
      return true;
    }
    // Fallback: try clicking the right anchor inside this grid's pagers
    const roots = [
      document.getElementById(gridId + '_DXPagerTop'),
      document.getElementById(gridId + '_DXPagerBottom')
    ].filter(Boolean);
    for (const root of roots) {
      let a =
        root.querySelector(`a[onclick*="aspxGVPagerOnClick('${gridId}','${arg}')"]`) ||
        root.querySelector('a[onclick*="PBN"]') ||
        Array.from(root.querySelectorAll('a')).find(el => /Next|›|>/.test(el.textContent || ''));
      if (a) {
        a.click();
        return true;
      }
    }
    return false;
  }, { gridId: baseId, cur });

  if (!invoked) return false;

  // Wait for pager number to increment on either pager; fallback to grid signature change
  const waitInc = async (sel, prev) => {
    if (prev == null) return false;
    return await page.waitForFunction((s, p) => {
      const r = document.querySelector(s);
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
    }, sel, cur, { timeout: 8000 }).then(() => true).catch(() => false);
  };

  let advanced = (await waitInc(topSel, cur)) || (await waitInc(bottomSel, cur));
  if (!advanced) {
    await waitGridChangeBySig(page, tableSel, beforeSig);
    const afterSig = await getGridSignature(page, tableSel);
    advanced = !!afterSig && afterSig !== beforeSig;
  }
  return advanced;
}

/* --------------------------- Discovery / parsing --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(),
    href: a.href
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

  const filtered = cleaned.filter(
    l => !/(account|login|cart|checkout|about|contact)/i.test(l.href)
  );

  const uniq = [];
  const seenHref = new Set();
  for (const l of filtered) {
    if (!seenHref.has(l.href)) {
      uniq.push(l);
      seenHref.add(l.href);
    }
  }

  const strong = uniq.filter(l => /(department|category|products)/i.test(l.href));
  const final = strong.length ? strong : uniq;

  return final
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER))
    .slice(0, 80);
}

async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;
    try {
      const onchange = await el.getAttribute('onchange').catch(() => null);
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const opt = opts.find(o => o.value === '50') || opts.find(o => /50/.test(o.textContent || ''));
        if (!opt) return false;
        node.value = opt.value;
        return true;
      }).catch(() => false);
      if (!picked) continue;

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
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(250);
      return true;
    } catch {}
  }
  return false;
}

/** Scrape products from THIS grid (uses ctx.tableSel). */
async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      return s && s.display !== 'none' && s.visibility !== 'hidden';
    };
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

    // Skip header and pager rows
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

      // Prefer visible text in description cell (exclude qty/buttons)
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

/* ------------------------------- DB upsert --------------------------------- */

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

/* --------------------------------- Main ------------------------------------ */

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
  const page = await context.newPage();

  console.log('🌐 Opening home…', STORE.baseUrl.replace('https://', 'http://'));
  try {
    await page.goto(STORE.baseUrl.replace('https://', 'http://'), { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    await page.goto(STORE.baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }
  await acceptCookies(page);
  await page.waitForTimeout(700);

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
      await page.goto(dept.href, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.warn(`⚠️ Could not open ${dept.href}: ${e.message}`);
      continue;
    }
    await acceptCookies(page);
    await setItemsPerPage(page);

    // Log pager summary (helpful while debugging)
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerSel) {
        const summary = await page.$eval(ctx0.pagerSel, el => (el.textContent || '').trim()).catch(() => null);
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

        const advanced = await clickNextForThisGrid(page, ctx);
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
    if (ctx?.pagerSel) {
      const pagerHtml = await page.$eval(ctx.pagerSel, n => n.outerHTML).catch(() => null);
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
