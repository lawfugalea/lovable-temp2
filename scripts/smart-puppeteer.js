/* scripts/smart-puppeteer.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'http://www.smart.com.mt',
};

/* ─── Flags ────────────────────────────────────────────────────────────────
   Examples:
   DRYRUN=1 CAT="Baby" MAX_PAGES=4 HEADFUL=1 DEBUG_DUMP=1 node scripts/smart-puppeteer.js
---------------------------------------------------------------------------*/
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES  = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;
const DRYRUN     = !!process.env.DRYRUN;
const HEADFUL    = !!process.env.HEADFUL;

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug'); if (DEBUG_DUMP) ensureDir(dumpDir);

/* ─── Utils ───────────────────────────────────────────────────────────────*/
function normalizeName(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function parsePriceToCents(raw){
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g,'').replace(',', '.');
  const f = parseFloat(t); return Number.isFinite(f) ? Math.round(f*100) : null;
}
function cssEscape(s){ return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,'\\$1'); }

async function ensureStore(){
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function upsertProductOffer(store, p, sourceUrl, category){
  const cents = parsePriceToCents(p.price);
  if (cents == null) return false;
  if (DRYRUN) { console.log(`[DRYRUN] ${category} :: ${p.name} — ${p.price} ${p.unit||''}`); return true; }

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
}

/* ─── Page helpers ───────────────────────────────────────────────────────*/
async function acceptCookies(page){
  for (const sel of [
    'text/Accept All/i','text/Accept all/i','text/Accept/i',
    'button:has-text("Accept")','.cookie-accept','#cookie-button',
    'text/I understand/i','text/Agree/i'
  ]) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(()=>{}); await page.waitForTimeout(150); break; }
    } catch {}
  }
}

async function setupBlocking(page){
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    const url = req.url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      /\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|mp4|avi)$/i.test(url) ||
      /google-analytics\.com|googletagmanager\.com|doubleclick\.net|facebook\.com\/tr|hotjar\.com/i.test(url)
    ) return req.abort();
    req.continue();
  });
}

async function discoverTopNav(page){
  // collect top nav “Products.aspx” links
  const links = await page.$$eval('a', as => as
    .map(a => ({ text: (a.textContent||'').trim(), href: a.href }))
    .filter(x => x.href && /Products\.aspx/i.test(x.href)));
  const seen = new Set(), out = [];
  for (const a of links){
    try {
      const u = new URL(a.href); const key = u.origin+u.pathname+u.search;
      if (!seen.has(key)) { seen.add(key); out.push({ name: a.text || 'Category', href: u.toString() }); }
    } catch {}
  }
  return out
    .filter(d => !/(account|login|cart|checkout|about|contact)/i.test(d.href))
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER));
}

async function waitGridReady(page){
  // Wait for a DevExpress grid main table to appear and its client object to exist
  const mainTableHandle = await page.waitForSelector('table[id$="_DXMainTable"]', { timeout: 10000 }).catch(()=>null);
  if (!mainTableHandle) return null;
  const mainId = await page.evaluate(n => n.id, mainTableHandle);
  const baseId = mainId.replace(/_DX.*$/, '');

  const ok = await page.waitForFunction((gridId) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    return !!getClient();
  }, baseId, { timeout: 10000 }).then(()=>true).catch(()=>false);

  if (!ok) return null;
  return { baseId, mainSel: `#${cssEscape(mainId)}` };
}

async function setItemsPerPage50(page){
  for (const sel of [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ]) {
    const el = await page.$(sel).catch(()=>null);
    if (!el) continue;
    const before = (await page.content()).slice(0, 2000);
    try {
      await el.select('50').catch(()=>{});
      await page.select(sel, '50').catch(()=>{});
    } catch {}
    try {
      await page.waitForFunction(prev => document.body && document.body.innerText !== prev, before, { timeout: 2500 });
    } catch {}
    return true;
  }
  return false;
}

/* Parse current grid page (DOM) */
async function collectProductsOnPage(page, mainSel){
  const items = await page.$eval(mainSel, (table) => {
    const out = [];
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return out;

    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);
    const isVisible = (el) => el && el.offsetParent !== null;

    const textize = (el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
      return (clone.innerText || '').replace(/\s+/g,' ').trim();
    };

    for (const row of dataRows){
      if (!isVisible(row)) continue;
      const rowText = textize(row);
      if (!/€\s*\d/.test(rowText)) continue;

      // prefer link text for name
      const nameLink = row.querySelector('td a');
      let name = (nameLink?.innerText || '').trim();
      if (!name) {
        const tds = Array.from(row.querySelectorAll('td')).map(textize);
        name = tds.find(t => t && !/€\s*\d/.test(t)) || '';
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name) continue;

      // price
      const priceMatch = rowText.match(/€\s*\d[\d\.,]*/);
      if (!priceMatch) continue;
      const price = priceMatch[0];

      // unit
      let unit = '';
      const m = rowText.match(/(?:\b[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets|L|G)\b|\bper\s+[A-Za-z]+\b)/i);
      if (m) unit = m[0];

      // link + image
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      const link = linkEl ? linkEl.href : '';
      const imgEl  = row.querySelector('img');
      const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset') || '';

      const brand = (name.split(/\s+/).find(w => !/\d/.test(w)) || '') || '';
      out.push({ name, price, unit, link, image, brand });
    }
    return out;
  }).catch(()=>[]);
  return items;
}

/* DevExpress fast pager using client API */
async function goNextPage(page, baseId){
  const info = await page.evaluate((gridId) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return { ok:false };
    const idx = typeof gv.GetPageIndex === 'function' ? gv.GetPageIndex() : null;
    const cnt = typeof gv.GetPageCount === 'function' ? gv.GetPageCount() : null;
    return { ok:true, idx, cnt };
  }, baseId);
  if (!info.ok || info.idx == null) return false;
  if (typeof info.cnt === 'number' && info.idx+1 >= info.cnt) return false;

  const target = info.idx + 1;

  // fire and wait for target index
  const fired = await page.evaluate((gridId, targetIdx) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return false;
    try {
      if (typeof gv.GotoPage === 'function') { gv.GotoPage(targetIdx); return true; }
      if (typeof gv.PerformCallback === 'function') { gv.PerformCallback('PN'+targetIdx); return true; }
      if (typeof window.aspxGVPagerOnClick === 'function') { window.aspxGVPagerOnClick(gridId, 'PN'+targetIdx); return true; }
    } catch {}
    return false;
  }, baseId, target);
  if (!fired) return false;

  // wait until the client index equals target
  const ok = await page.waitForFunction(({ id, target }) => {
    const getClient = () => {
      const direct = window[id]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(id) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return false;
    if (typeof gv.InCallback === 'function' && gv.InCallback()) return false;
    return typeof gv.GetPageIndex === 'function' && gv.GetPageIndex() === target;
  }, { id: baseId, target }, { timeout: 2500 }).then(()=>true).catch(()=>false);

  return ok;
}

/* Debug dump */
async function dump(page, category, pageNum, mainSel){
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g,'_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true });
    if (mainSel){
      const tableHtml = await page.$eval(mainSel, n => n.outerHTML).catch(()=>null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
  } catch {}
}

/* ─── Main ────────────────────────────────────────────────────────────────*/
async function run(){
  console.log('▶️ Starting Smart Puppeteer scraper…');
  if (!process.env.DATABASE_URL && !DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for a no-DB test)');
  }
  const store = await ensureStore();

  const browser = await puppeteer.launch({
    headless: !HEADFUL,
    args: ['--no-sandbox','--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  await setupBlocking(page);

  await page.goto(STORE.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const depts = (await discoverTopNav(page)).slice(0, 80);
  console.log('📂 Departments:', depts.map(d => d.name).join(', ') || '(none)');

  let totalProducts = 0, totalOffers = 0;

  for (const dept of depts){
    console.log(`\n📁 Processing: ${dept.name} (${dept.href})`);
    await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
    await acceptCookies(page);
    await setItemsPerPage50(page).catch(()=>{});

    const grid = await waitGridReady(page);
    if (!grid) { console.log('⚠️ Grid not ready; skipping.'); continue; }
    const { baseId, mainSel } = grid;

    let pageNum = 1;
    for (;;){
      // Wait until the table has a Euro price (content mounted)
      try {
        await page.waitForFunction((sel) => {
          const t = document.querySelector(sel); if (!t) return false;
          const txt = (t.innerText||'').slice(0, 2000);
          return /€\s*\d/.test(txt);
        }, mainSel, { timeout: 4000 });
      } catch {}

      const items = await collectProductsOnPage(page, mainSel);
      console.log(`🧾 Page ${pageNum}: ${items.length} items`);
      if (DEBUG_DUMP) await dump(page, dept.name, pageNum, mainSel);

      for (const p of items){
        const sourceUrl = p.link || `${page.url()}#${normalizeName(p.name)}`;
        const ok = await upsertProductOffer(store, p, sourceUrl, dept.name);
        if (ok) { totalProducts++; totalOffers++; }
      }

      if (MAX_PAGES && pageNum >= MAX_PAGES) break;

      const advanced = await goNextPage(page, baseId);
      if (!advanced) break;

      pageNum++;
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
}

run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
