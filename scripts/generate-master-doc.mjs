#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import prettyBytes from 'pretty-bytes';
import { fileURLToPath } from 'url';

const MAX_SNIPPET_BYTES = 150 * 1024; // 150 KB per file
const ROOT = process.cwd();

const INCLUDE = [
  '.nvmrc',
  'package.json',
  'next.config.*',
  'tailwind.config.*',
  'postcss.config.*',
  'tsconfig*.json',
  'Dockerfile',
  'captain-definition',
  '.caproverignore',
  '.github/workflows/**/*',
  'prisma/schema.prisma',
  'prisma/migrations/**/migration.sql',
  'src/pages/**/*.{ts,tsx,js,jsx}',
  'src/app/**/*.{ts,tsx,js,jsx}',
  'src/components/**/*.{ts,tsx,js,jsx}',
  'src/lib/**/*.{ts,tsx,js,jsx}',
  'src/utils/**/*.{ts,tsx,js,jsx}',
  'scripts/**/*.{ts,js}',
];

const EXCLUDE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.git/**',
  '**/*.map',
  '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.webp', '**/*.gif',
  '**/*.mp4', '**/*.mp3', '**/*.wav',
  '**/*.zip', '**/*.tar', '**/*.bz2', '**/*.gz',
  '**/.env*',
  'public/**',
  'smart_debug/**',
  'log.txt',
];

function readSafe(p) {
  try {
    const buf = fs.readFileSync(p);
    const size = buf.byteLength;
    if (size > MAX_SNIPPET_BYTES) {
      const head = buf.subarray(0, MAX_SNIPPET_BYTES);
      return {
        content: head.toString('utf8') + `\n/* ... (truncated, ${prettyBytes(size)} total) */\n`,
        truncated: true,
        size
      };
    }
    return { content: buf.toString('utf8'), truncated: false, size };
  } catch (e) {
    return { content: `/* failed to read ${p}: ${String(e)} */`, truncated: false, size: 0 };
  }
}

function codeFenceFor(asPath) {
  const base = path.basename(asPath);
  const ext = path.extname(asPath);
  if (base === 'Dockerfile') return 'dockerfile';
  if (ext === '.ts' || ext === '.tsx') return 'ts';
  if (ext === '.js' || ext === '.cjs' || ext === '.mjs') return 'js';
  if (ext === '.json') return 'json';
  if (ext === '.prisma') return 'prisma';
  if (ext === '.sql') return 'sql';
  return '';
}

function tree(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => !d.name.startsWith('.') || d.name === '.github' || d.name === '.vscode')
    .filter(d => !['node_modules', '.next', '.git'].includes(d.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map((e, i) => {
    const isLast = i === entries.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
    if (e.isDirectory()) {
      const sub = tree(path.join(dir, e.name), nextPrefix)
        .split('\n').filter(Boolean).map(l => nextPrefix + l).join('\n');
      return branch + e.name + '\n' + sub;
    }
    return branch + e.name;
  }).join('\n');
}

function printFile(asPath) {
  const abs = path.join(ROOT, asPath);
  const { content, size, truncated } = readSafe(abs);
  const fence = codeFenceFor(asPath);
  console.log(`\n### ${asPath}`);
  console.log('```' + fence);
  console.log(content.replace(/```/g, '\u0060\u0060\u0060'));
  console.log('```');
  if (truncated) console.log(`> Note: truncated (full size ${prettyBytes(size)})`);
}

const main = async () => {
  const repoName = path.basename(ROOT);
  const branch = process.env.GIT_BRANCH || '';
  const commit = process.env.GIT_COMMIT || '';
  const now = new Date().toISOString();

  console.log(`# Houseflow — Master Project Document`);
  console.log(`> Generated on: ${now}`);
  console.log(`> Repo: ${repoName} @ ${branch} | Commit: ${commit}\n`);

  console.log(`## 0. TL;DR`);
  console.log(`- What this project is: Household app (shopping lists, finances, invites)`);
  console.log(`- Tech: Next.js (Pages Router), TypeScript, Tailwind, Prisma + Postgres, NextAuth, CapRover/Docker, GitHub Actions`);
  const live = process.env.LIVE_URLS || '';
  if (live) console.log(`- Live URL(s): ${live}`);
  console.log(`\n---\n`);

  console.log(`## 1. Project Overview`);
  console.log(`- Purpose & scope\n- User roles & permissions\n- High-level features\n- Status & constraints`);

  console.log(`## 2. Architecture & Tech Stack`);
  console.log(`- Frontend/Backend/Auth/DB/Infra/CI overview`);

  console.log(`## 3. Directory Tree (pruned)`);
  console.log('```');
  console.log(tree(ROOT));
  console.log('```\n');

  const configFiles = await globby(INCLUDE, { gitignore: true, ignore: EXCLUDE, dot: true });

  console.log(`## 4. Environment & Configuration`);
  for (const f of configFiles.filter(f =>
    ['.nvmrc','package.json','next.config.js','tailwind.config.js','postcss.config.js','tsconfig.json','Dockerfile','captain-definition','.caproverignore']
      .some(k => f.endsWith(k))
  )) {
    printFile(f);
  }

  console.log(`\n## 5. Database (Prisma)`);
  const prismaSchema = configFiles.find(f => f.endsWith('prisma/schema.prisma'));
  if (prismaSchema) printFile(prismaSchema);

  const migs = await globby('prisma/migrations/**/migration.sql', { ignore: EXCLUDE, dot: true });
  if (migs.length) {
    console.log('\n### Migrations (summaries)');
    for (const m of migs) {
      const text = readSafe(path.join(ROOT, m)).content;
      const head = text.split('\n').slice(0, 60).join('\n');
      console.log(`\n#### ${m}`);
      console.log('```sql');
      console.log(head);
      console.log('```');
    }
  }

  console.log(`\n## 6. Application Code (Key Files)`);
  const pageFiles = await globby(['src/pages/**/*.{ts,tsx,js,jsx}','src/app/**/*.{ts,tsx,js,jsx}'], { ignore: EXCLUDE, dot: true });
  for (const f of pageFiles) printFile(f);

  console.log(`\n### Components & Lib`);
  const compFiles = await globby(['src/components/**/*.{ts,tsx,js,jsx}','src/lib/**/*.{ts,tsx,js,jsx}','src/utils/**/*.{ts,tsx,js,jsx}'], { ignore: EXCLUDE, dot: true });
  for (const f of compFiles) printFile(f);

  console.log(`\n## 7. Auth (NextAuth)`);
  const authFiles = await globby(['src/pages/api/auth/**/*','src/app/api/auth/**/*'], { ignore: EXCLUDE, dot: true });
  if (authFiles.length) authFiles.forEach(printFile);

  console.log(`\n## 8. Utilities / Scripts`);
  const scriptFiles = await globby(['scripts/**/*.{ts,js}'], { ignore: EXCLUDE, dot: true });
  for (const f of scriptFiles) printFile(f);

  console.log(`\n## 9. Build & Run`);
  console.log(`- Dev: npm run dev`);
  console.log(`- Build: npm run build → Start: npm start (or CapRover)`);
  console.log(`- Node: from .nvmrc if present`);

  console.log(`\n## 10. Deployment`);
  console.log(`- CapRover app, image, domain, envs`);
  console.log(`- Prisma generate on build`);

  console.log(`\n## 11. Known Issues / TODO`);
  console.log(`- Fill as needed`);

  console.log(`\n## 12. Appendix — package.json`);
  printFile('package.json');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
