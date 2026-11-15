// 매일 갱신되는 카드 두 장을 만든다. (GitHub Actions에서 실행, 결과물은 output 브랜치로 올라간다)
//   ps-{dark,light}.svg   : Algorithm 레포를 집계한 문제 풀이 현황
//   blog-{dark,light}.svg : 블로그 최신 글 3개
import { mkdirSync, writeFileSync } from 'node:fs';

const OWNER = process.env.GITHUB_REPOSITORY_OWNER || 'canach3';
const ALGO_REPO = process.env.ALGO_REPO || `${OWNER}/Algorithm`;
const BLOG_URL = (process.env.BLOG_URL || 'https://canacode.blog').replace(/\/$/, '');
const OUT = process.env.OUT_DIR || 'dist';
const TOKEN = process.env.GITHUB_TOKEN;

const W = 704;
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const THEMES = {
  dark: {
    bg: '#0d1117', border: '#30363d', text: '#e6edf3', muted: '#8b949e', track: '#21262d',
    accent: ['#34d399', '#38bdf8'],
    series: ['#34d399', '#38bdf8', '#818cf8', '#64748b'],
    tiers: { Bronze: '#c96a12', Silver: '#6b8cae', Gold: '#ec9a00', Platinum: '#27e2a4', Diamond: '#00b4fc', Ruby: '#ff0062' },
  },
  light: {
    bg: '#ffffff', border: '#d0d7de', text: '#1f2328', muted: '#59636e', track: '#eaeef2',
    accent: ['#059669', '#0284c7'],
    series: ['#10b981', '#0ea5e9', '#6366f1', '#94a3b8'],
    tiers: { Bronze: '#ad5600', Silver: '#435f7a', Gold: '#ec9a00', Platinum: '#1fc48d', Diamond: '#00b4fc', Ruby: '#ff0062' },
  },
};

const n = (v) => Number(v.toFixed(2));
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) =>
  String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

// 실제 렌더링 폭을 알 수 없으므로 글자 종류별 대략적인 폭으로 추정한다.
function textWidth(str, size) {
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c >= 0x1100) w += size;
    else if (ch === ' ') w += size * 0.3;
    else if (/[A-Z]/.test(ch)) w += size * 0.68;
    else if (/[0-9]/.test(ch)) w += size * 0.6;
    else if (/[a-z]/.test(ch)) w += size * 0.55;
    else w += size * 0.38;
  }
  return w;
}

function truncate(str, size, max) {
  if (textWidth(str, size) <= max) return str;
  let out = '';
  for (const ch of str) {
    if (textWidth(out + ch + '…', size) > max) break;
    out += ch;
  }
  return out.trimEnd() + '…';
}

function frame(width, height, theme, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.accent[0]}"/>
      <stop offset="1" stop-color="${theme.accent[1]}"/>
    </linearGradient>
  </defs>
  <rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>
  <g font-family="${SANS}">
${body}
  </g>
</svg>
`;
}

const caps = (x, y, text, theme, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="10.5" letter-spacing="1.3" text-anchor="${anchor}" fill="${theme.muted}">${esc(text)}</text>`;

function stackedBar({ id, x, y, w, h, parts, theme }) {
  const gap = 2;
  const min = 5;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const avail = w - gap * (parts.length - 1);
  const raw = parts.map((p) => (p.value / total) * avail);
  const small = raw.map((v) => v < min);
  const reserved = small.filter(Boolean).length * min;
  const bigSum = raw.reduce((s, v, i) => s + (small[i] ? 0 : v), 0) || 1;
  const widths = raw.map((v, i) => (small[i] ? min : (v / bigSum) * (avail - reserved)));
  let cx = x;
  const rects = parts.map((p, i) => {
    const r = `<rect x="${n(cx)}" y="${y}" width="${n(widths[i])}" height="${h}" fill="${p.color}"/>`;
    cx += widths[i] + gap;
    return r;
  });
  return `    <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"><animate attributeName="width" values="0;${w}" keyTimes="0;1" calcMode="spline" keySplines=".2 .7 .2 1" dur="1.1s" fill="freeze"/></rect></clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${theme.track}"/>
    <g clip-path="url(#${id})">${rects.join('')}</g>`;
}

function legend({ x, y, w, items, theme, size = 12 }) {
  const widths = items.map((it) => 13 + textWidth(it.label, size) + 5 + textWidth(it.value.toLocaleString('en-US'), size));
  const total = widths.reduce((a, b) => a + b, 0);
  let gap = 18;
  if (items.length > 1 && total + gap * (items.length - 1) > w) gap = Math.max(6, (w - total) / (items.length - 1));
  let cx = x;
  return items
    .map((it, i) => {
      const s =
        `    <circle cx="${n(cx + 4)}" cy="${y - 4}" r="4" fill="${it.color}"/>` +
        `<text x="${n(cx + 13)}" y="${y}" font-size="${size}"><tspan font-weight="600" fill="${theme.text}">${esc(it.label)}</tspan>` +
        `<tspan dx="5" fill="${theme.muted}">${it.value.toLocaleString('en-US')}</tspan></text>`;
      cx += widths[i] + gap;
      return s;
    })
    .join('\n');
}

// ---------- 문제 풀이 현황 ----------

async function loadSolved() {
  const res = await fetch(`https://api.github.com/repos/${ALGO_REPO}/git/trees/HEAD?recursive=1`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'profile-cards',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${ALGO_REPO} 트리 조회 실패: HTTP ${res.status}`);
  const { tree } = await res.json();

  // 풀이 파일이 들어 있는 폴더 하나를 문제 하나로 센다. (같은 문제를 여러 언어로 풀어도 1문제)
  const CODE = /\.(java|kt|py|cpp|cc|c|cs|js|ts|go|rs|rb|swift|sql)$/i;
  const judges = new Map();
  const tiers = new Map();
  const seen = new Set();
  for (const item of tree) {
    if (item.type !== 'blob' || !CODE.test(item.path)) continue;
    const parts = item.path.split('/');
    if (parts.length < 3) continue;
    const dir = parts.slice(0, -1).join('/');
    if (seen.has(dir)) continue;
    seen.add(dir);
    judges.set(parts[0], (judges.get(parts[0]) || 0) + 1);
    if (parts[0] === '백준') tiers.set(parts[1], (tiers.get(parts[1]) || 0) + 1);
  }
  return { judges, tiers, total: seen.size };
}

function psCard({ judges, tiers, total }, theme) {
  const sorted = [...judges.entries()].sort((a, b) => b[1] - a[1]);
  const major = sorted.filter(([, v]) => v / total >= 0.02).slice(0, 3);
  const rest = total - major.reduce((s, [, v]) => s + v, 0);
  const judgeParts = major.map(([label, value], i) => ({ label, value, color: theme.series[i] }));
  if (rest > 0) judgeParts.push({ label: '기타', value: rest, color: theme.series[3] });

  const tierParts = Object.keys(theme.tiers)
    .filter((t) => tiers.get(t))
    .map((t) => ({ label: t, value: tiers.get(t), color: theme.tiers[t] }));

  const width = 350;
  const x = 20;
  const w = width - x * 2;
  const count = total.toLocaleString('en-US');
  const body = [
    `    <linearGradient id="count" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${n(x + textWidth(count, 40))}" y2="0"><stop offset="0" stop-color="${theme.accent[0]}"/><stop offset="1" stop-color="${theme.accent[1]}"/></linearGradient>`,
    caps(x, 30, 'PROBLEMS SOLVED', theme),
    `    <text x="${x - 1}" y="76"><tspan font-size="40" font-weight="800" letter-spacing="-1" fill="url(#count)">${count}</tspan>` +
      `<tspan dx="8" font-size="12" fill="${theme.muted}">문제 · ${judges.size}개 플랫폼</tspan></text>`,
    stackedBar({ id: 'judge', x, y: 92, w, h: 8, parts: judgeParts, theme }),
    legend({ x, y: 117, w, items: judgeParts, theme, size: 11 }),
    stackedBar({ id: 'tier', x, y: 130, w, h: 8, parts: tierParts, theme }),
    legend({ x, y: 155, w, items: tierParts, theme, size: 11 }),
  ].join('\n');
  return frame(width, 170, theme, `문제 풀이 ${total}개`, body);
}

// ---------- 블로그 최신 글 ----------

async function loadPosts() {
  const res = await fetch(`${BLOG_URL}/feed.xml`, { headers: { 'User-Agent': 'profile-cards' } });
  if (!res.ok) throw new Error(`블로그 피드 조회 실패: HTTP ${res.status}`);
  const xml = await res.text();
  const posts = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const title = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const date = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    const category = entry.match(/<category term="([^"]+)"/)?.[1];
    if (title && date) posts.push({ title: unesc(title).trim(), date: date.slice(0, 10).replace(/-/g, '.'), category: category ? unesc(category) : '' });
  }
  if (!posts.length) throw new Error('블로그 피드에서 글을 찾지 못했습니다');
  return posts.slice(0, 3);
}

function blogCard(posts, theme) {
  const host = BLOG_URL.replace(/^https?:\/\//, '');
  const rows = posts.map((p, i) => {
    const y = 78 + i * 34;
    const catW = p.category ? textWidth(p.category, 11) + 16 : 0;
    const title = truncate(p.title, 14, W - 28 - 122 - (catW ? catW + 12 : 0));
    return [
      i > 0 ? `    <line x1="28" y1="${y - 21}" x2="${W - 28}" y2="${y - 21}" stroke="${theme.track}"/>` : '',
      `    <text x="28" y="${y}" font-family="${MONO}" font-size="12" fill="${theme.muted}">${p.date}</text>`,
      `    <text x="122" y="${y}" font-size="14" font-weight="500" fill="${theme.text}">${esc(title)}</text>`,
      catW
        ? `    <rect x="${n(W - 28 - catW)}" y="${y - 15}" width="${n(catW)}" height="21" rx="10.5" fill="${theme.track}"/>` +
          `<text x="${n(W - 28 - catW / 2)}" y="${y - 0.5}" font-size="11" text-anchor="middle" fill="${theme.muted}">${esc(p.category)}</text>`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  });
  const body = [
    caps(28, 42, 'LATEST POSTS', theme),
    `    <text x="${W - 28}" y="42" font-family="${MONO}" font-size="12" text-anchor="end" fill="url(#accent)">${esc(host)} →</text>`,
    ...rows,
  ].join('\n');
  return frame(W, 78 + (posts.length - 1) * 34 + 26, theme, '블로그 최신 글', body);
}

// ---------- 실행 ----------

mkdirSync(OUT, { recursive: true });
const jobs = [
  ['ps', loadSolved, psCard],
  ['blog', loadPosts, blogCard],
];
let failed = false;
for (const [name, load, render] of jobs) {
  try {
    const data = await load();
    for (const [mode, theme] of Object.entries(THEMES)) {
      writeFileSync(`${OUT}/${name}-${mode}.svg`, render(data, theme));
    }
    console.log(`${name} 카드 생성 완료`);
  } catch (err) {
    failed = true;
    console.error(`::warning::${name} 카드 생성 실패 - ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
