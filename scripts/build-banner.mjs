// 프로필 상단 배너(assets/header.svg)와 하단 푸터(assets/footer.svg)를 만든다.
// 문구를 바꾸고 싶으면 아래 PROFILE 값만 고친 뒤 `node scripts/build-banner.mjs` 를 실행하면 된다.
import { mkdirSync, writeFileSync } from 'node:fs';

const PROFILE = {
  name: 'Cana',
  role: 'Backend Developer',
  tagline: ['실시간 결제 · 경매 · 채팅처럼', '정합성이 중요한 흐름을 설계하고 구현합니다.'],
  pill: 'canacode.blog',
  terminalTitle: 'cana@github: ~',
  terminal: [
    { cmd: 'whoami', out: 'cana · backend developer', color: '#9fb0c5' },
    { cmd: 'ls ~/projects', out: 'tikkle  tripagora  vintib  license-hunter', color: '#7dd3fc' },
    { cmd: 'cat focus.txt', out: 'real-time payments · auctions · chat', color: '#9fb0c5' },
  ],
  footer: 'echo "thanks for visiting"',
};

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const n = (v) => Number(v.toFixed(4));

// 애니메이션이 지원되지 않는 환경에서는 최종 상태(전부 보이는 상태)가 그대로 보이도록,
// "기본값 = 보임"으로 두고 0초부터 숨겼다가 정해진 시각에 나타나게 한다.
const appearAt = (t) =>
  `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${n((t - 0.12) / t)};1" dur="${n(t)}s" fill="freeze"/>`;

function header() {
  const CHAR = 7.8; // 13px 고정폭 글자 한 칸
  const X = 544; // 터미널 본문 시작 x
  const TYPE = 0.07; // 글자당 타이핑 시간(초)

  let t = 0.9;
  let y = 108;
  const clips = [];
  const rows = [];
  let promptAt = 0;

  PROFILE.terminal.forEach((line, i) => {
    const len = line.cmd.length;
    const start = t;
    const end = start + len * TYPE;
    const widths = [0];
    const times = [0];
    for (let k = 1; k <= len; k++) {
      widths.push(k === len ? n(len * CHAR + 10) : n(k * CHAR));
      times.push(n((start + (k - 1) * TYPE) / end));
    }
    clips.push(
      `<clipPath id="type${i}"><rect x="${X + 15}" y="${y - 14}" width="${n(len * CHAR + 10)}" height="20">` +
        `<animate attributeName="width" calcMode="discrete" values="${widths.join(';')}" keyTimes="${times.join(';')}" dur="${n(end)}s" fill="freeze"/>` +
        `</rect></clipPath>`,
    );
    const outAt = end + 0.25;
    rows.push(
      `<g>${promptAt ? appearAt(promptAt) : ''}<text x="${X}" y="${y}" fill="#34d399">$</text>` +
        `<text x="${X + 16}" y="${y}" fill="#e6edf3" clip-path="url(#type${i})">${line.cmd}</text></g>`,
      `<text x="${X}" y="${y + 22}" fill="${line.color}">${appearAt(outAt)}${line.out}</text>`,
    );
    promptAt = outAt;
    t = outAt + 0.6;
    y += 44;
  });

  rows.push(
    `<g>${appearAt(promptAt)}<text x="${X}" y="${y}" fill="#34d399">$</text>` +
      `<rect class="cursor" x="${X + 16}" y="${y - 12}" width="8" height="15" rx="1" fill="#34d399"/></g>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="300" viewBox="0 0 960 300" role="img" aria-labelledby="title desc">
  <title id="title">${PROFILE.name} — ${PROFILE.role}</title>
  <desc id="desc">${PROFILE.tagline.join(' ')}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#090f1d"/>
      <stop offset="1" stop-color="#0f1c30"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
    <radialGradient id="glowA">
      <stop offset="0" stop-color="#34d399" stop-opacity=".26"/>
      <stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB">
      <stop offset="0" stop-color="#38bdf8" stop-opacity=".24"/>
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#ffffff" fill-opacity=".07"/>
    </pattern>
    <clipPath id="frame"><rect width="960" height="300" rx="22"/></clipPath>
    ${clips.join('\n    ')}
  </defs>
  <style>
    .sans { font-family: ${SANS}; }
    .mono { font-family: ${MONO}; }
    .rise { animation: rise .8s cubic-bezier(.2,.7,.2,1) both; }
    .d1 { animation-delay: .05s; } .d2 { animation-delay: .18s; } .d3 { animation-delay: .31s; } .d4 { animation-delay: .44s; } .d5 { animation-delay: .6s; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .orb-a { animation: driftA 16s ease-in-out infinite alternate; }
    .orb-b { animation: driftB 21s ease-in-out infinite alternate; }
    @keyframes driftA { to { transform: translate(70px, 36px); } }
    @keyframes driftB { to { transform: translate(-80px, -30px); } }
    .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 2.4s ease-out infinite; }
    @keyframes pulse { from { transform: scale(1); opacity: .6; } to { transform: scale(2.8); opacity: 0; } }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .rise, .orb-a, .orb-b, .pulse, .cursor { animation: none; }
    }
  </style>

  <g clip-path="url(#frame)">
    <rect width="960" height="300" fill="url(#bg)"/>
    <circle class="orb-a" cx="120" cy="20" r="260" fill="url(#glowA)"/>
    <circle class="orb-b" cx="880" cy="310" r="280" fill="url(#glowB)"/>
    <rect width="960" height="300" fill="url(#dots)"/>
    <rect y="297" width="960" height="3" fill="url(#accent)"/>
  </g>
  <rect x=".5" y=".5" width="959" height="299" rx="21.5" fill="none" stroke="#ffffff" stroke-opacity=".08"/>

  <g class="rise d1">
    <rect x="56" y="46" width="146" height="28" rx="14" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".12"/>
    <circle class="pulse" cx="74" cy="60" r="4" fill="#34d399"/>
    <circle cx="74" cy="60" r="4" fill="#34d399"/>
    <text class="mono" x="88" y="64.5" font-size="12" fill="#c9d5e3">${PROFILE.pill}</text>
  </g>
  <text class="sans rise d2" x="53" y="160" font-size="92" font-weight="800" letter-spacing="-3" fill="url(#accent)">${PROFILE.name}</text>
  <text class="sans rise d3" x="58" y="200" font-size="26" font-weight="600" fill="#e6edf3">${PROFILE.role}</text>
  <g class="sans rise d4" font-size="15" fill="#8b98ab">
    <text x="58" y="234">${PROFILE.tagline[0]}</text>
    <text x="58" y="256">${PROFILE.tagline[1]}</text>
  </g>

  <g class="rise d5">
    <rect x="520" y="44" width="392" height="212" rx="12" fill="#0a1222" fill-opacity=".82" stroke="#ffffff" stroke-opacity=".1"/>
    <circle cx="542" cy="62" r="5.5" fill="#ff5f57"/>
    <circle cx="560" cy="62" r="5.5" fill="#febc2e"/>
    <circle cx="578" cy="62" r="5.5" fill="#28c840"/>
    <text class="mono" x="716" y="66" font-size="12" text-anchor="middle" fill="#64748b">${PROFILE.terminalTitle}</text>
    <line x1="520" y1="80" x2="912" y2="80" stroke="#ffffff" stroke-opacity=".08"/>
    <g class="mono" font-size="13">
      ${rows.join('\n      ')}
    </g>
  </g>
</svg>
`;
}

function footer() {
  const text = PROFILE.footer.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="56" viewBox="0 0 960 56" role="img" aria-label="thanks for visiting">
  <defs>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34d399" stop-opacity="0"/>
      <stop offset=".5" stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 50% { fill-opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
  </style>
  <rect x="120" y="8" width="720" height="1.5" rx=".75" fill="url(#line)"/>
  <text x="480" y="38" text-anchor="middle" font-family="${MONO}" font-size="13" fill="#8b949e"><tspan fill="#34d399">$</tspan> ${text} <tspan class="cursor" fill="#34d399">█</tspan></text>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/header.svg', header());
writeFileSync('assets/footer.svg', footer());
console.log('assets/header.svg, assets/footer.svg 생성 완료');
