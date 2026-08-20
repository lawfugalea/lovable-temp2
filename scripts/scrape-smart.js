/* scripts/scrape-smart.js */
const fs = require('fs');
const path = require('path');
const { chromium, request } = require('playwright');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'http://www.smart.com.mt',
};

// Hardcoded top nav categories - scrape these for everything in one go per menu
const TOP_DEPARTMENTS = [
  { name: 'Baby', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-55' },
  { name: 'Bakery', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-10' },
  { name: 'Drinks', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-15' },
  { name: 'Food Cupboard', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-20' },
  { name: 'Fresh Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-25' },
  { name: 'Frozen Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-30' },
  { name: 'General', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-60' },
  { name: 'Health and Beauty', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-35' },
  { name: 'Home', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-40' },
  { name: 'Household', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-45' },
  { name: 'Pets', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-50' },
];

/* Debug flags (handy while fixing pagination)
   Example: DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 CONCURRENCY=3 PAGE_DELAY=2000 HEADLESS=false node scripts/scrape-smart.js */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const PAGE_DELAY = parseInt(process.env.PAGE_DELAY || '0', 10);
const HEADLESS = process.env.HEADLESS !== 'false';

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

function safeSmartSourceUrl(value, fallback) {
  try {
    const url = new URL(value || fallback);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (!['smart.com.mt', 'www.smart.com.mt'].includes(url.hostname.toLowerCase())) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
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
    'text=Accept All','text=Accept all','text=Accept',
    'button:has-text("Accept")','text=I understand','text=Agree',
    '.cookie-accept','#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(() => {}); break; }
    } catch {}
  }
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
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

async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      const baseId = id.replace(/_DX.*$/, '');
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);
  if (!info.length) return null;
  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];
  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerTopSel = `#${cssEscape(best.baseId + '_DXPagerTop')}`;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  return { baseId: best.baseId, tableSel, pagerTopSel, pagerBottomSel };
}
function cssEscape(s) { return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1'); }

async function gridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, table => (table.innerText || '').trim());
}

async function waitGridChanged(page, tableSel, oldSignature, timeout = 60000) {
  if (!tableSel) return false;
  return await page.waitForFunction(({ selector, previous }) => {
    const table = document.querySelector(selector);
    if (!table) return false;
    const signature = (table.innerText || '').trim();
    return Boolean(signature && signature !== previous);
  }, { selector: tableSel, previous: oldSignature }, { timeout }).then(() => true).catch(() => false);
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

async function waitPagerIncrement(page, pagerSel, prev, timeout = 60000) {
  if (prev == null) return false;
  return await page.waitForFunction(({ selector, previous }) => {
    const r = document.querySelector(selector);
    if (!r) return false;
    const curEl = r.querySelector('span.dxp-current, [aria-current="page"]');
    if (curEl) {
      const n = parseInt((curEl.textContent || '').trim(), 10);
      return Number.isFinite(n) && n > previous;
    }
    const sEl = r.querySelector('.dxp-summary, .dxp-lead');
    if (sEl) {
      const m = /Page\s+(\d+)\s+of\s+\d+/.exec(sEl.textContent || '');
      if (m) {
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) && n > previous;
      }
    }
    return false;
  }, { selector: pagerSel, previous: prev }, { timeout }).then(() => true).catch(() => false);
}

/* ----------------------- Pager interaction (hybrid click + JS) -------------------- */

async function goNextPage(page, ctx) {
  if (!ctx) return false;
  const { baseId, pagerTopSel, pagerBottomSel } = ctx;
  let pagerSel = pagerTopSel;
  let { cur, total } = await readPagerInfo(page, pagerSel);
  if (cur == null) {
    pagerSel = pagerBottomSel;
    ({ cur, total } = await readPagerInfo(page, pagerSel));
  }
  if (cur == null) { console.log('Pager: cannot read current page'); return false; }
  if (total != null && cur >= total) {
    console.log(`Pager: reached final page ${cur} of ${total}`);
    return false;
  }
  const t0 = Date.now();
  // Try click first
  let advanced = false;
  const nextSel = `${pagerTopSel} b[onclick*="PBN"], ${pagerBottomSel} b[onclick*="PBN"], ${pagerTopSel} a[onclick*="PBN"], ${pagerBottomSel} a[onclick*="PBN"]`;
  await page.waitForSelector(nextSel, { state: 'attached' }).catch(() => {});  // Wait for attachment to fix detach error
  const nextEl = await page.$(nextSel).catch(() => null);
  if (nextEl) {
    console.log('Found next button with selector; attempting click...');
    await nextEl.click({ force: true }).catch(e => console.log('Click failed:', e.message));
    advanced = await waitPagerIncrement(page, pagerSel, cur, 15000);
  }
  // Fallback to JS callback if click didn't advance
  if (!advanced) {
    console.log('Click did not advance; falling back to JS callback for next page...');
    const token = `__dx_end_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fired = await page.evaluate(({ gridId, token }) => {
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
      if (!gv) return { ok: false, why: 'no client object' };
      const handler = function onEnd() {
        try { gv.EndCallback && gv.EndCallback.RemoveHandler(onEnd); } catch {}
        window[token] = 'done';
      };
      try {
        if (gv.EndCallback && gv.EndCallback.AddHandler) gv.EndCallback.AddHandler(handler);
      } catch {}
      try {
        if (typeof gv.PerformCallback === 'function') {
          gv.PerformCallback('PBN');  // PBN for Page Next
        } else if (typeof window.aspxGVPagerOnClick === 'function') {
          window.aspxGVPagerOnClick(gridId, 'PBN');
        } else {
          return { ok: false, why: 'no pager method' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, why: String(e) };
      }
    }, { gridId: baseId, token });
    if (fired.ok) {
      await page.waitForFunction(tok => window[tok] === 'done', token, { timeout: 15000 }).catch(() => false);
      advanced = await waitPagerIncrement(page, pagerSel, cur, 15000);
    } else {
      console.log('JS callback failed:', fired.why);
    }
  }
  const timeTaken = Date.now() - t0;
  const after = advanced ? (await readPagerInfo(page, pagerSel)).cur : cur;
  console.log(`Pager flip ${advanced ? 'OK' : 'FAILED'} in ${timeTaken}ms (from ${cur} -> ${after ?? '?'})`);
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
  return advanced;
}

/* --------------------------- Discovery / parse --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(), href: a.href
  })).filter(x => x.href && x.href.startsWith('http')));
  const nameSet = new Set(TOP_DEPARTMENTS.map(d => d.name.toLowerCase()));
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
          href: u.toString().replace('https://', 'http://'),
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

async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;
    const ctxBefore = await getGridContext(page);
    const sigBefore = ctxBefore?.tableSel ? await gridSignature(page, ctxBefore.tableSel) : '';
    try {
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const values = opts.map(o => parseInt(o.value, 10)).filter(Number.isFinite);
        if (!values.length) return { success: false, max: 0 };
        const max = Math.max(...values);
        const opt = opts.find(o => parseInt(o.value, 10) === max);
        if (!opt) return { success: false, max: 0 };
        node.value = opt.value;
        return { success: true, max };
      }).catch(() => ({ success: false, max: 0 }));
      if (!picked.success) continue;
      console.log(`Set items per page to max: ${picked.max}`);
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
        await page.selectOption(sel, { value: String(picked.max) }).catch(() => {});
      }
      const ctxAfter = await getGridContext(page);
      const selAfter = ctxAfter?.tableSel || ctxBefore?.tableSel;
      const changed = await waitGridChanged(page, selAfter, sigBefore, 60000);
      if (changed) {
        return true;
      }
    } catch {}
  }
  return false;
}

async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => el && el.offsetParent !== null;
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
      let priceStr = '';
      const tdTexts = tds.map((td) => textFrom(td));
      for (const tx of tdTexts) {
        const m = tx.match(/€\s*\d[\d\.,]*/);
        if (m) { priceStr = m[0]; break; }
      }
      if (!priceStr) continue;
      let unit = '';
      const unitEl = row.querySelector('small, .unit, .size');
      if (unitEl) unit = (unitEl.innerText || '').trim();
      if (!unit) {
        const m = rowText.match(/(?:per|\/)\s*[A-Za-z]+|[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets)/i);
        if (m) unit = m[0].trim();
      }
      if (/items per page/i.test(unit)) unit = '';
      let link = '';
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      link = linkEl?.href || '';
      const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset') || '';
      const brand = (name.split(/\s+/).find((w) => !/\d/.test(w)) || '') || '';
      out.push({ name, price: priceStr, unit, link, image, brand });
    }
    return out;
  });
  console.log(`Parsed ${products.length} product rows`);
  return products;
}

/* ------------------------------- DB upsert -------------------------------- */

async function batchUpsertProductsAndOffers(store, items, categoryPath, isDryRun) {
  if (isDryRun) {
    items.forEach(p => console.log(`[DRYRUN] ${categoryPath} :: ${p.name} — ${p.price} ${p.unit || ''}`));
    return items.length;
  }
  const observedAt = new Date();
  const recordsByIdentity = new Map();
  for (const p of items) {
    const fallbackSourceUrl = `${STORE.baseUrl}/forms/Products.aspx#${encodeURIComponent(normalizeName(p.name))}`;
    const sourceUrl = safeSmartSourceUrl(p.link, fallbackSourceUrl);
    const data = {
      name: p.name,
      brand: p.brand || null,
      imageUrl: p.image || null,
      nameNormalized: normalizeName(p.name),
      storeId: store.id,
      sourceUrl,
      externalId: sourceUrl || `${categoryPath}:${normalizeName(p.name)}`,
      active: true,
      missingSyncCount: 0,
      lastSeenAt: observedAt,
    };
    recordsByIdentity.set(`${store.id}:${data.externalId}`, { data, item: p });
  }
  const persistRecord = async ({ data, item }) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await prisma.$transaction(async tx => {
          const existing = await tx.priceProduct.findFirst({
            where: {
              storeId: store.id,
              OR: [{ externalId: data.externalId }, { sourceUrl: data.sourceUrl }],
            },
            select: { id: true },
          });
          const product = existing
            ? await tx.priceProduct.update({ where: { id: existing.id }, data })
            : await tx.priceProduct.create({ data });
          const latest = await tx.priceOffer.findFirst({
            where: { productId: product.id },
            orderBy: { scrapedAt: 'desc' },
            select: { priceCents: true, regularPriceCents: true, available: true },
          });
          const priceCents = parsePriceToCents(item.price);
          if (priceCents == null) throw new Error(`Invalid Smart price for ${item.name}`);
          if (latest?.priceCents === priceCents && latest.regularPriceCents === priceCents && latest.available) return false;
          await tx.priceOffer.create({
            data: {
              productId: product.id,
              storeId: store.id,
              priceCents,
              regularPriceCents: priceCents,
              unit: item.unit || null,
              category: categoryPath || null,
              available: true,
              scrapedAt: observedAt,
            },
          });
          return true;
        });
      } catch (error) {
        if (error?.code !== 'P2002' || attempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
    return false;
  };
  const changedOffers = await Promise.all(Array.from(recordsByIdentity.values()).map(persistRecord));
  return changedOffers.filter(Boolean).length;
}

/* --------------------------------- Main ----------------------------------- */

async function createContext(browser, proxyUrl) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HouseflowScraper/1.0 Chrome/120 Safari/537.36',
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
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
  return context;
}

// Use hardcoded tops, filter by CAT
const allDepts = CAT_FILTER ? TOP_DEPARTMENTS.filter(d => normalizeName(d.name).includes(CAT_FILTER)) : TOP_DEPARTMENTS;

async function scrapeDepartment(dept, store, browser, proxyUrl, isDryRun) {
  const context = await createContext(browser, proxyUrl);
  const page = await context.newPage();
  try {
    const categoryPath = dept.name;
    console.log(`\n📁 [Parallel] Processing: ${categoryPath} (${dept.href})`);
    const deptStart = Date.now();
    await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await setItemsPerPage(page);
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerTopSel || ctx0?.pagerBottomSel) {
        const sel = (ctx0.pagerTopSel || '') + (ctx0.pagerBottomSel ? `, ${ctx0.pagerBottomSel}` : '');
        const summary = await page.$eval(sel, el => (el.textContent || '').trim()).catch(() => null);
        if (summary) console.log('Pager text:', summary);
      }
    } catch {}
    let pageNum = 1;
    let deptProducts = 0;
    let deptOffers = 0;
    for (;;) {
      const pageStart = Date.now();
      const ctx = await getGridContext(page);
      if (!ctx?.tableSel) {
        if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
        throw new Error(`No product grid detected for expected Smart department ${categoryPath}`);
      }
      const items = await collectProductsOnPage(page, ctx);
      console.log(`🧾 [${categoryPath}] Page ${pageNum}: found ${items.length} items (took ${(Date.now() - pageStart)/1000}s)`);
      if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
      const processed = await batchUpsertProductsAndOffers(store, items, categoryPath, isDryRun);
      deptProducts += items.length;
      deptOffers += processed;
      if (MAX_PAGES && pageNum >= MAX_PAGES) break;
      const advanced = await goNextPage(page, ctx);
      if (!advanced) break;
      pageNum++;
    }
    if (deptProducts === 0) {
      throw new Error(`No products parsed for expected Smart department ${categoryPath}`);
    }
    console.log(`Finished ${categoryPath} in ${(Date.now() - deptStart)/1000/60} min (products: ${deptProducts}, offers: ${deptOffers})`);
    return { products: deptProducts, offers: deptOffers };
  } finally {
    await context.close();
  }
}

async function run() {
  console.log('▶️ Starting Smart scraper…');
  if (!process.env.DATABASE_URL && !process.env.DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for no-DB test)');
  }
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const reachable = await httpProbe(STORE.baseUrl, proxyUrl);  // Probe HTTP
  if (!reachable) {
    throw new Error('Smart catalogue is not reachable; existing prices were left unchanged.');
  }
  const isDryRun = !!process.env.DRYRUN;
  const store = isDryRun ? { id: 'dryrun-smart' } : await ensureStore();
  const browser = await chromium.launch({
    headless: HEADLESS,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  try {
    let totalProducts = 0;
    let totalOffers = 0;
    // Parallel scrape depts in batches
    for (let i = 0; i < allDepts.length; i += CONCURRENCY) {
      const batch = allDepts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(dept => scrapeDepartment(dept, store, browser, proxyUrl, isDryRun)));
      results.forEach(res => {
        totalProducts += res.products;
        totalOffers += res.offers;
      });
    }
    console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
  } finally {
    await browser.close();
  }
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
