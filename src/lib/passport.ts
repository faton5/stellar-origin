export const PASSPORT_FORMATS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  desktop: { width: 2560, height: 1440 },
  mobile: { width: 1440, height: 2560 }
} as const;

export type PassportFormat = keyof typeof PASSPORT_FORMATS;

export type PassportData = {
  dateIso: string;
  moonPhase: string;
  earthYears: number;
  marsYears: number;
  apodTitle?: string;
  lang: 'en' | 'fr';
};

export type PassportSpec = {
  width: number;
  height: number;
  lines: string[];
  lang: 'en' | 'fr';
};

export function buildPassportSpec(format: PassportFormat, data: PassportData, includePersonal: boolean): PassportSpec {
  const lines = data.lang === 'fr'
    ? [
        'GALAXIE  /  VOIE LACTÉE',
        'MONDE D’ORIGINE  /  TERRE',
        `LUNE  /  ${data.moonPhase}`,
        `ÂGE TERRESTRE  /  ${data.earthYears.toFixed(1)} ANS`,
        `ÂGE MARTIEN  /  ${data.marsYears.toFixed(1)} ANS`
      ]
    : [
        'GALAXY  /  MILKY WAY',
        'HOME WORLD  /  EARTH',
        `MOON  /  ${data.moonPhase}`,
        `EARTH AGE  /  ${data.earthYears.toFixed(1)} YEARS`,
        `MARS AGE  /  ${data.marsYears.toFixed(1)} YEARS`
      ];
  if (includePersonal) {
    lines.push(`${data.lang === 'fr' ? 'NAISSANCE' : 'BIRTH'}  /  ${data.dateIso}`);
    if (data.apodTitle) lines.push(`APOD  /  ${data.apodTitle}`);
  }
  return { ...PASSPORT_FORMATS[format], lines, lang: data.lang };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawPassport(canvas: HTMLCanvasElement, spec: PassportSpec): void {
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const { width: w, height: h } = spec;
  const portrait = h > w;
  const p = w * 0.075;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#03050a');
  bg.addColorStop(0.55, '#081324');
  bg.addColorStop(1, '#020407');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Procedural stars and a purely illustrative planetary silhouette.
  let seed = 814933;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < Math.round((w * h) / 8000); i++) {
    const x = rand() * w, y = rand() * h, r = rand() * 1.7 + 0.3;
    ctx.globalAlpha = rand() * 0.55 + 0.18;
    ctx.fillStyle = i % 9 === 0 ? '#e8c88c' : '#f4f6ff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const cx = portrait ? w * 0.55 : w * 0.75;
  const cy = portrait ? h * 0.78 : h * 0.56;
  const radius = portrait ? w * 0.57 : h * 0.47;
  const glow = ctx.createRadialGradient(cx - radius * 0.26, cy - radius * 0.35, radius * 0.05, cx, cy, radius * 1.45);
  glow.addColorStop(0, '#688ab2'); glow.addColorStop(0.42, '#173c61'); glow.addColorStop(0.68, '#0b192b'); glow.addColorStop(1, 'rgba(5,12,24,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.45, 0, Math.PI * 2); ctx.fill();
  const sphere = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.38, radius * 0.1, cx, cy, radius);
  sphere.addColorStop(0, '#678fb2'); sphere.addColorStop(0.4, '#244963'); sphere.addColorStop(0.72, '#102738'); sphere.addColorStop(1, '#030712');
  ctx.fillStyle = sphere; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(185,212,240,0.32)'; ctx.lineWidth = Math.max(2, w * 0.0015);
  ctx.beginPath(); ctx.ellipse(cx, cy, radius * 1.36, radius * 0.31, -0.38, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(232,200,140,0.48)';
  ctx.beginPath(); ctx.ellipse(cx, cy, radius * 1.59, radius * 0.38, -0.38, Math.PI * 0.92, Math.PI * 1.52); ctx.stroke();

  ctx.fillStyle = '#e8c88c'; ctx.font = `600 ${Math.round(w * 0.019)}px Arial, sans-serif`;
  ctx.letterSpacing = `${Math.round(w * 0.004)}px`;
  ctx.fillText('✦  STELLAR ORIGIN', p, p + w * 0.025);
  ctx.letterSpacing = '0px';
  const titleSize = Math.min(w * (portrait ? 0.086 : 0.062), h * 0.11);
  ctx.fillStyle = '#f4f6ff'; ctx.font = `500 ${Math.round(titleSize)}px Georgia, serif`;
  ctx.fillText('A LIFE', p, p + h * 0.16);
  ctx.fillText('IN ORBIT', p, p + h * 0.16 + titleSize * 1.04);
  ctx.fillStyle = '#b4c6dd'; ctx.font = `${Math.round(w * (portrait ? 0.024 : 0.015))}px Arial, sans-serif`;
  ctx.fillText('Your birth. Your moment. Your universe.', p, p + h * 0.22 + titleSize * 1.04);

  const infoY = portrait ? h * 0.38 : h * 0.47;
  const lineHeight = portrait ? h * 0.041 : h * 0.065;
  const fontSize = Math.round(w * (portrait ? 0.025 : 0.015));
  ctx.font = `500 ${fontSize}px Arial, sans-serif`;
  const maxWidth = portrait ? w - 2 * p : w * 0.48;
  let y = infoY;
  for (const line of spec.lines) {
    ctx.fillStyle = 'rgba(244,246,255,0.82)';
    const wrapped = wrapText(ctx, line, maxWidth);
    for (const part of wrapped.slice(0, 2)) { ctx.fillText(part, p, y); y += lineHeight * 0.55; }
    y += lineHeight * 0.45;
  }
  ctx.strokeStyle = 'rgba(232,200,140,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p, h - p * 1.4); ctx.lineTo(w - p, h - p * 1.4); ctx.stroke();
  ctx.fillStyle = '#aabdd2'; ctx.font = `${Math.round(w * 0.013)}px Arial, sans-serif`;
  ctx.fillText('STELLAR ORIGIN  ·  PROCEDURAL ARTWORK', p, h - p * 0.9);
}

export function passportBlob(spec: PassportSpec): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawPassport(canvas, spec);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
