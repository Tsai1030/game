import { emit } from '../core/bus';
import { esc, L, LANGS, rich, t, type Lang } from '../core/i18n';
import { switchLang } from '../core/lang';
import { rng } from '../core/random';
import { saveSettings, settings, type TextSpeed } from '../core/settings';
import { S, TACTIC_IDS, type EvidenceSource, type TacticId } from '../core/state';
import { browserStore } from '../core/storage';
import { CASE, type ClueId, type LogLevel } from '../data/case';
import { CODEX } from '../data/codex';
import { story } from '../data/story';
import { TOOL_INFO, type Thing } from '../data/world';
import { gainClue, setCoffee, setEtch, solveCase } from '../game/effects';
import { judge, type Pick3 } from '../systems/conclusion';
import { say } from './scene';
import { toast } from './toast';
import { closeWin, openWin, rerenderWin, showTab } from './win';

const chip = (kind: '' | 'bad' | 'warn', text: string): string => `<span class="chip ${kind}" id="win-chip">${esc(text)}</span>`;

/** 把語系模板裡的 {name} 換成 HTML（例如下拉選單），其他文字照常跳脫。 */
function fillTpl(tpl: string, slots: Record<string, string>): string {
  return tpl
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      return m && m[1]! in slots ? slots[m[1]!]! : esc(part);
    })
    .join('');
}

/* ===== PE 工作站 ===== */

/** 結論表單的選擇；切換語言重畫時要保留。 */
const rcPick: Partial<Pick3> = {};

function drawChart(root: HTMLElement): void {
  const W = 640;
  const H = 240;
  const Lx = 46;
  const Rr = 84;
  const Tp = 14;
  const B = 30;
  const n = CASE.spc.length;
  const x = (i: number) => Math.round(Lx + i * ((W - Lx - Rr) / (n - 1)));
  const y = (v: number) => Math.round(Tp + ((48 - v) / 5) * (H - Tp - B));
  let s = '';
  for (let v = 43; v <= 48; v++)
    s += `<line class="g" x1="${Lx}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}"/><text x="${Lx - 8}" y="${y(v) + 5}" text-anchor="end">${v.toFixed(1)}</text>`;
  for (const [k, v, c] of [['UCL', 46.5, 'lim'], ['Target', 45, 'tgt'], ['LCL', 43.5, 'lim']] as const)
    s += `<line class="${c}" x1="${Lx}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}"/><text class="${c}-t" x="${W - Rr + 6}" y="${y(v) + 5}">${k} ${v.toFixed(1)}</text>`;
  s += `<polyline class="pl" points="${CASE.spc.map((p, i) => `${x(i)},${y(p[2])}`).join(' ')}"/>`;
  CASE.spc.forEach((p, i) => {
    s += `<rect class="pt ${p[1] === 'B' ? 'b' : 'a'}${p[2] > 46.5 ? ' ooc' : ''}" data-i="${i}" x="${x(i) - 6}" y="${y(p[2]) - 6}" width="12" height="12"/>`;
    if (i % 4 === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">#${i + 1}</text>`;
  });
  const svg = root.querySelector('#spc')!;
  svg.innerHTML = s;
  const read = (el: Element) => {
    const d = CASE.spc[Number((el as HTMLElement).dataset.i)]!;
    root.querySelector('#spc-read')!.textContent = `${d[0]} · ETCH-07 PM-${d[1]} · ${d[2].toFixed(1)} nm${d[2] > 46.5 ? ' · OOC' : ''}`;
    return d;
  };
  svg.addEventListener('pointerover', (e) => {
    const p = (e.target as Element).closest('.pt');
    if (p) read(p);
  });
  svg.addEventListener('click', (e) => {
    const p = (e.target as Element).closest('.pt');
    if (!p) return;
    if (read(p)[2] > 46.5) gainClue('spc');
    else toast(t('toast.inControl'));
  });
}

const lotsHTML = (): string =>
  `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('pc.colLot'))}</th><th>${esc(t('pc.colTool'))}</th><th class="n">${esc(t('pc.colCd'))}</th><th>${esc(t('pc.colState'))}</th></tr></thead><tbody>` +
  CASE.lots
    .map(
      (l) =>
        `<tr class="${S.solved ? '' : l.j}"><td>${l.id}</td><td>${l.tool} / ${l.ch}</td><td class="n">${l.cd.toFixed(1)}</td><td>${S.solved && l.st === 'HOLD' ? esc(t('pc.released')) : l.st}</td></tr>`,
    )
    .join('') +
  `</tbody></table></div><p class="note">${esc(t(S.solved ? 'pc.lotsNoteSolved' : 'pc.lotsNote'))}</p>`;

const select = (id: string, aria: string, opts: [string, string][], val?: string): string =>
  `<select id="${id}" aria-label="${esc(aria)}"><option value="">${esc(t('pc.rcUnknown'))}</option>` +
  opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('') +
  `</select>`;

function rcHTML(): string {
  if (S.solved) return `<p class="big">${esc(t('pc.rcSolved'))}</p>`;
  const tool = select('rc-tool', t('pc.toolAria'), CASE.tools.map((v) => [v, v]), rcPick.tool);
  const ch = select('rc-ch', t('pc.chAria'), CASE.chambers.map((v) => [v, v]), rcPick.ch);
  const cause = select('rc-cause', t('pc.causeAria'), CASE.causes.map((c) => [c.id, L(c)]), rcPick.cause);
  return (
    `<div class="evi">${rich(t('pc.evidence', { n: S.clues.length }))}</div>` +
    `<div class="rc"><p>${fillTpl(t('pc.rcLine1'), { tool, ch })}</p><p>${fillTpl(t('pc.rcLine2'), { cause })}</p></div>` +
    `<div><button class="pbtn primary" id="rc-go">${esc(t('pc.rcSubmit'))}</button></div>`
  );
}

function submitRC(): void {
  const v = judge(CASE.answer, rcPick, S.clues.length, CASE.minClues);
  if (v === 'incomplete') return toast(t('toast.rcIncomplete'), 'bad');
  if (v === 'need-evidence') return toast(t('toast.rcNeedEvidence'), 'bad');
  closeWin();
  if (v === 'wrong') {
    setCoffee(S.coffee - 1);
    say(story.rc_wrong);
    return;
  }
  solveCase();
  say(story.rc_solved, { params: { n: S.clues.length, c: S.coffee } });
}

function rcOn(root: HTMLElement): void {
  // 重畫後再用程式設定一次選擇；不只靠 selected 屬性（有些 DOM 實作解析 selected 不可靠）。
  for (const [id, v] of [['#rc-tool', rcPick.tool], ['#rc-ch', rcPick.ch], ['#rc-cause', rcPick.cause]] as const) {
    const sel = root.querySelector<HTMLSelectElement>(id);
    if (sel && v) sel.value = v;
  }
  root.addEventListener('change', (e) => {
    const el = e.target as HTMLSelectElement;
    const v = el.value || undefined;
    if (el.id === 'rc-tool') rcPick.tool = v;
    else if (el.id === 'rc-ch') rcPick.ch = v;
    else if (el.id === 'rc-cause') rcPick.cause = v;
  });
  root.querySelector('#rc-go')?.addEventListener('click', submitRC);
}

export function openPC(): void {
  openWin({
    title: () => t('pc.title'),
    chip: () => (S.solved ? chip('', t('chip.ok')) : chip('bad', t('chip.spcAlarm'))),
    tabs: [
      {
        label: () => t('pc.tabSpc'),
        html: () =>
          `<p class="hint2">${rich(t('pc.spcHint'))}</p><div class="chart-wrap"><svg id="spc" viewBox="0 0 640 240" role="img" aria-label="${esc(t('pc.chartAria'))}"></svg></div>` +
          `<div class="legend"><span><i></i>PM-A</span><span><i class="lb"></i>PM-B</span><span><i class="lo"></i>OOC</span><span>${esc(t('pc.legend'))}</span></div>` +
          `<div class="readout" id="spc-read">${esc(t('pc.readout'))}</div>`,
        on: drawChart,
      },
      { label: () => t('pc.tabLots'), html: lotsHTML },
      { label: () => t('pc.tabRc'), html: rcHTML, on: rcOn },
    ],
  });
}

/* ===== ETCH-07 ===== */

const LV: Record<LogLevel, string> = { ok: '[ OK ]', info: '[INFO]', warn: '[WARN]', alarm: '[ALRM]' };
let grepQ = '';

const etchChip = (): string =>
  S.etch === 'alarm' ? chip('bad', t('chip.alarm')) : S.etch === 'inhibit' ? chip('warn', t('chip.inhibit')) : chip('', t('chip.run'));

function etchStatusHTML(): string {
  const [cls, label] =
    S.etch === 'fixed' ? ['run', t('etch.pmFixed')] : S.etch === 'inhibit' ? ['inh', t('etch.pmInhibit')] : ['alarm', t('etch.pmAlarm')];
  return (
    `<div class="cluster">` +
    `<div class="pm a run">PM-A<small>${esc(t('etch.pmRun', { lot: 'N9K416.1' }))}</small></div>` +
    `<div class="pm b ${cls}">PM-B<small>${esc(label)}</small></div>` +
    `<div class="pm c idle">PM-C<small>${esc(t('etch.pmIdle'))}</small></div>` +
    `<div class="pm d run">PM-D<small>${esc(t('etch.pmRun', { lot: 'N9K418.1' }))}</small></div>` +
    `<div class="tm">TM<small>${esc(t('etch.tm'))}</small></div><div class="ef">${esc(t('etch.efem'))}</div>` +
    `<div class="l1">LP1<small>N9K418.1</small></div><div class="l2">LP2<small>${esc(t('etch.lpEmpty'))}</small></div><div class="l3">LP3<small>N9K419.1</small></div>` +
    `</div><ul class="alist">` +
    (S.etch === 'fixed' ? `<li class="ok">${esc(t('etch.alFixed'))}</li>` : '') +
    `<li class="bad">${esc(t('etch.al1'))}</li><li>${esc(t('etch.al2'))}</li><li class="warn">${esc(t('etch.al3'))}</li></ul>`
  );
}

function drawLog(root: HTMLElement): void {
  const q = grepQ.trim().toLowerCase();
  const rows = CASE.logs.map((r, i) => ({ r, i })).filter(({ r }) => !q || [r.t, r.src, r.ch, L(r.msg)].join(' ').toLowerCase().includes(q));
  const re = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
  // 先在原文上找符合的片段，再分段跳脫；直接在跳脫後的字串上標記會切壞 &gt; 這類實體。
  const hi = (s: string) => {
    if (!re) return esc(s);
    let out = '';
    let at = 0;
    for (const m of s.matchAll(re)) {
      out += `${esc(s.slice(at, m.index))}<mark>${esc(m[0])}</mark>`;
      at = m.index + m[0].length;
    }
    return out + esc(s.slice(at));
  };
  root.querySelector('#log')!.innerHTML = rows.length
    ? rows
        .map(({ r, i }) => `<div class="ln ${r.lv}" data-i="${i}"><span class="t">${r.t}</span> ${LV[r.lv]} ${hi(r.src.padEnd(7))} ${hi(r.ch.padEnd(4))} ${hi(L(r.msg))}</div>`)
        .join('')
    : `<div class="ln">${esc(t('etch.noMatch', { q: grepQ }))}</div>`;
}

function logOn(root: HTMLElement): void {
  drawLog(root);
  root.querySelector<HTMLInputElement>('#grep')!.addEventListener('input', (e) => {
    grepQ = (e.target as HTMLInputElement).value;
    drawLog(root);
  });
  root.querySelector('#log')!.addEventListener('click', (e) => {
    const ln = (e.target as HTMLElement).closest<HTMLElement>('.ln[data-i]');
    if (!ln) return;
    root.querySelectorAll('#log .ln').forEach((x) => x.classList.toggle('pick', x === ln));
    const i = ln.dataset.i!;
    const clue = CASE.logClue[i];
    if (clue) gainClue(clue);
    else toast(CASE.logNote[i] ? L(CASE.logNote[i]!) : t('toast.logNormal'));
  });
}

function consHTML(): string {
  const rows = CASE.cons
    .map((c, i) => {
      const fresh = S.etch === 'fixed' && i === 0;
      const pct = fresh ? 1 : c.pct;
      const val = fresh ? t('etch.newPart') : L(c.val);
      return `<button class="con ${pct >= 90 ? 'hi' : pct >= 70 ? 'mid' : ''}" data-i="${i}"><b>${esc(c.name)}</b><span class="num">${esc(val)}</span><span class="bar"><i style="width:${pct}%"></i></span></button>`;
    })
    .join('');
  return `<p class="hint2">${rich(t('etch.consHint'))}</p><div class="cons">${rows}</div>`;
}

function consOn(root: HTMLElement): void {
  root.querySelector('.cons')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.con');
    if (!b) return;
    const c = CASE.cons[Number(b.dataset.i)]!;
    if (c.clue && S.etch !== 'fixed') gainClue(c.clue);
    else toast(t('toast.consOk'));
  });
}

export function openEtch(): void {
  openWin({
    title: () => t('etch.title'),
    chip: etchChip,
    tabs: [
      { label: () => t('etch.tabStatus'), html: etchStatusHTML },
      {
        label: () => t('etch.tabLog'),
        html: () =>
          `<p class="hint2">${rich(t('etch.logHint'))}</p><div class="crt"><div class="crt-grep"><label for="grep">$ grep -i</label>` +
          `<input id="grep" value="${esc(grepQ)}" placeholder="${esc(t('etch.grepPh'))}" autocomplete="off"></div><div class="crt-log" id="log"></div></div>`,
        on: logOn,
      },
      { label: () => t('etch.tabCons'), html: consHTML, on: consOn },
    ],
    foot: () =>
      `<button class="pbtn danger" data-f="inhibit">${esc(t('etch.inhibitBtn'))}</button><button class="pbtn" data-f="ticket">${esc(t('etch.ticketBtn'))}</button>`,
    onFoot: (a) => {
      if (a === 'ticket') return toast(t('toast.ticket'));
      if (S.etch !== 'alarm') return toast(t('toast.inhibitAlready'));
      setEtch('inhibit');
      toast(t('toast.inhibit'), 'bad');
      rerenderWin();
      showTab(0);
    },
  });
}

/* ===== MET-02 ===== */

function drawWafer(root: HTMLElement): void {
  const r = rng(CASE.waferSeed);
  const N = 21;
  const Cc = 10;
  const RAD = 9.2;
  let h = '';
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const dx = i - Cc;
      const dy = j - Cc;
      const d = Math.hypot(dx, dy);
      if (d > RAD) {
        const rim = d <= RAD + 1.25 && !(dx === 0 && dy > 9);
        h += `<span class="d ${rim ? 'rim' : 'v'}"></span>`;
        continue;
      }
      let cd = 45 + (r() - 0.5) * 0.6;
      const e = d / RAD;
      if (e > 0.72) cd += ((e - 0.72) / 0.28) * 2.7 * (0.75 + r() * 0.5);
      if (r() < 0.015) cd += 1.6;
      const k = cd > 46.5 ? 4 : cd > 46 ? 3 : cd > 45.5 ? 2 : 1;
      h += `<button class="d k${k}" data-x="${dx}" data-y="${-dy}" data-cd="${cd.toFixed(1)}" data-r="${d.toFixed(1)}" aria-label="die ${dx},${-dy}"></button>`;
    }
  const map = root.querySelector('#wmap')!;
  map.innerHTML = h;
  const read = (d: HTMLElement) => {
    const cd = Number(d.dataset.cd);
    const judge = t(cd > 46.5 ? 'met.oos' : cd > 46 ? 'met.high' : 'met.pass');
    root.querySelector('#w-read')!.textContent = t('met.die', { x: d.dataset.x!, y: d.dataset.y!, cd: cd.toFixed(1), judge });
    return cd;
  };
  map.addEventListener('pointerover', (e) => {
    const d = (e.target as HTMLElement).closest<HTMLElement>('button.d');
    if (d) read(d);
  });
  map.addEventListener('click', (e) => {
    const d = (e.target as HTMLElement).closest<HTMLElement>('button.d');
    if (!d) return;
    const cd = read(d);
    if (cd > 46.5 && Number(d.dataset.r) > 7) gainClue('map');
    else toast(t(cd > 46.5 ? 'toast.dieRandom' : 'toast.dieNormal'));
  });
}

export function openMet(): void {
  openWin({
    title: () => t('met.title'),
    chip: () => chip('', t('chip.run')),
    tabs: [
      {
        label: () => t('met.tab'),
        html: () =>
          `<p class="hint2">${rich(t('met.hint'))}</p><div class="wbox"><div class="wmap" id="wmap" aria-label="${esc(t('met.aria'))}"></div>` +
          `<div class="readout num" id="w-read">${esc(t('met.readout'))}</div>` +
          `<div class="scale"><span><i style="background:var(--c1)"></i>≤45.5</span><span><i style="background:var(--c2)"></i>≤46.0</span><span><i style="background:var(--c3)"></i>≤46.5</span><span><i style="background:var(--c4)"></i>OOS</span></div></div>`,
        on: drawWafer,
      },
    ],
  });
}

/* ===== 其他機台、線索簿 ===== */

export function openTool(o: Thing): void {
  const info = TOOL_INFO[o.id as keyof typeof TOOL_INFO];
  if (!info) return;
  openWin({
    title: () => `${o.id} · ${L(info.type)}`,
    chip: () => chip(info.st === 'IDLE' ? 'warn' : '', t(info.st === 'IDLE' ? 'chip.idle' : 'chip.run')),
    tabs: [
      {
        label: () => t('tool.tab'),
        html: () =>
          `<dl class="kv">${info.rows.map(([k, v]) => `<dt>${esc(L(k))}</dt><dd>${esc(L(v))}</dd>`).join('')}</dl><p class="note">${esc(L(info.note))}</p>`,
      },
    ],
  });
}

export function openClues(): void {
  openWin({
    title: () => t('clues.title'),
    chip: () => chip('', `${S.clues.length}/5`),
    tabs: [
      {
        label: () => t('clues.title'),
        html: () =>
          `<ol class="cluelist">` +
          (Object.keys(CASE.clues) as ClueId[])
            .map((k) =>
              S.clues.includes(k)
                ? `<li class="got"><b>${esc(L(CASE.clues[k].t))}</b><small>${esc(L(CASE.clues[k].src))}</small></li>`
                : `<li><b>${esc(t('clues.unknown'))}</b><small>${esc(t('clues.notFound'))}</small></li>`,
            )
            .join('') +
          `</ol><p class="note">${esc(t('clues.note'))}</p>`,
      },
    ],
  });
}

/* ===== 證據簿、圖鑑 ===== */

const SOURCES: EvidenceSource[] = ['talk', 'chat', 'meeting'];
let evFilter: EvidenceSource | 'all' = 'all';
let codexSel: TacticId | null = null;

function evidenceHTML(): string {
  const items = [...S.evidence].sort((a, b) => a.time.localeCompare(b.time)).filter((e) => evFilter === 'all' || e.source === evFilter);
  const filters =
    `<div class="segs">${seg('data-src', 'all', evFilter === 'all', t('ev.all'))}` +
    SOURCES.map((s) => seg('data-src', s, evFilter === s, t('ev.src.' + s))).join('') +
    `</div>`;
  if (!S.evidence.length) return `${filters}<p class="note">${esc(t('ev.empty'))}</p>`;
  return (
    filters +
    `<ol class="evlist">` +
    items
      .map(
        (e) =>
          `<li data-id="${esc(e.id)}"><span class="ev-meta"><b class="num">${esc(e.time)}</b> · ${esc(t('ev.src.' + e.source))} · ${esc(t('speaker.' + e.speaker))}</span><span class="ev-text">${esc(L(e))}</span></li>`,
      )
      .join('') +
    `</ol>`
  );
}

export function openEvidence(): void {
  openWin({
    title: () => t('ev.title'),
    chip: () => chip('', String(S.evidence.length)),
    tabs: [
      {
        label: () => t('ev.title'),
        html: evidenceHTML,
        on: (root) =>
          root.addEventListener('click', (e) => {
            const b = (e.target as HTMLElement).closest<HTMLElement>('[data-src]');
            if (!b) return;
            evFilter = b.dataset.src as EvidenceSource | 'all';
            rerenderWin();
          }),
      },
    ],
  });
}

function codexHTML(): string {
  const cards = TACTIC_IDS.map((id) => {
    const open = S.codex.includes(id);
    return `<button class="codex-card${open ? ' got' : ''}" data-card="${id}" aria-pressed="${codexSel === id}">${esc(open ? L(CODEX[id].name) : t('codex.locked'))}</button>`;
  }).join('');
  let detail = '';
  if (codexSel && S.codex.includes(codexSel)) {
    const c = CODEX[codexSel];
    detail =
      `<div class="codex-detail"><b>${esc(L(c.name))}</b>` +
      `<p><span class="lbl">${esc(t('codex.what'))}</span>${esc(L(c.what))}</p>` +
      `<p><span class="lbl">${esc(t('codex.todo'))}</span>${esc(L(c.todo))}</p></div>`;
  } else if (codexSel) detail = `<p class="note">${esc(t('codex.locked'))}</p>`;
  return `<div class="codex-grid">${cards}</div>${detail}`;
}

export function openCodex(): void {
  codexSel = null;
  openWin({
    title: () => t('codex.title'),
    chip: () => chip('', `${S.codex.length}/${TACTIC_IDS.length}`),
    tabs: [
      {
        label: () => t('codex.title'),
        html: codexHTML,
        on: (root) =>
          root.addEventListener('click', (e) => {
            const b = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
            if (!b) return;
            codexSel = b.dataset.card as TacticId;
            rerenderWin();
          }),
      },
    ],
  });
}

/* ===== 設定 ===== */

const SPEEDS: TextSpeed[] = ['slow', 'normal', 'instant'];
const seg = (attr: string, val: string, on: boolean, label: string): string =>
  `<button class="seg" ${attr}="${val}" aria-pressed="${on}">${esc(label)}</button>`;

function settingsHTML(): string {
  return (
    `<div class="setrow"><span>${esc(t('settings.lang'))}</span><div class="segs">${LANGS.map((l) => seg('data-lang', l, settings.lang === l, t('lang.' + l))).join('')}</div></div>` +
    `<div class="setrow"><span>${esc(t('settings.textSpeed'))}</span><div class="segs">${SPEEDS.map((s) => seg('data-speed', s, settings.textSpeed === s, t('settings.' + s))).join('')}</div></div>` +
    `<div class="setrow"><span>${esc(t('settings.reduceMotion'))}</span><div class="segs">${seg('data-rm', 'on', settings.reduceMotion, t('settings.on'))}${seg('data-rm', 'off', !settings.reduceMotion, t('settings.off'))}</div></div>`
  );
}

function settingsOn(root: HTMLElement): void {
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button.seg');
    if (!b) return;
    if (b.dataset.lang) {
      switchLang(b.dataset.lang as Lang);
    } else if (b.dataset.speed) {
      settings.textSpeed = b.dataset.speed as TextSpeed;
      saveSettings(browserStore());
    } else if (b.dataset.rm) {
      settings.reduceMotion = b.dataset.rm === 'on';
      saveSettings(browserStore());
      document.documentElement.classList.toggle('rm', settings.reduceMotion);
    }
    rerenderWin();
  });
}

export function openSettings(): void {
  openWin({
    title: () => t('settings.title'),
    tabs: [{ label: () => t('settings.title'), html: settingsHTML, on: settingsOn }],
    foot: () => `<button class="pbtn" data-f="toTitle">${esc(t('settings.toTitle'))}</button>`,
    onFoot: (a) => {
      if (a !== 'toTitle') return;
      closeWin();
      emit('toTitle');
    },
  });
}

/** 新遊戲時清掉上一輪留下的結論選擇與 grep 關鍵字，避免直接露出答案。 */
export function resetCaseUi(): void {
  delete rcPick.tool;
  delete rcPick.ch;
  delete rcPick.cause;
  grepQ = '';
}
