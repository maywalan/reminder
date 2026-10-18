import type { StringKey } from '@/i18n/strings';
import type { Plan } from '@/store/types';

/**
 * The 24 plan icons from design_handoff_tickle_home_timeline ("Icon set"): 24pt grid, drawn as
 * strokes only. Path data is copied from the `ICONS` array in `Tickle home timeline.dc.html`.
 */

export type PlanIconId =
  | 'work' | 'people' | 'laptop' | 'mail' | 'book' | 'brush'
  | 'run' | 'gym' | 'heart' | 'pill' | 'tooth' | 'moon'
  | 'home' | 'leaf' | 'cart' | 'meal' | 'coffee' | 'paw'
  | 'plane' | 'car' | 'gift' | 'cake' | 'money' | 'music';

export interface PlanIconDef {
  id: PlanIconId;
  labelKey: StringKey;
  d: string;
  /** Title words that suggest this icon. English matches whole words (a trailing "s" is ignored); Thai matches anywhere, since Thai has no spaces. */
  en: string[];
  th: string[];
}

export interface PlanIconCategory {
  labelKey: StringKey;
  icons: PlanIconDef[];
}

export const PLAN_ICON_CATEGORIES: PlanIconCategory[] = [
  {
    labelKey: 'icon.cat.work',
    icons: [
      { id: 'work', labelKey: 'icon.work', d: 'M4 8h16v11H4zM9 8V5.5h6V8M4 13h16', en: ['work', 'office', 'shift', 'job', 'project', 'deadline', 'report', 'submit'], th: ['งาน', 'ออฟฟิศ', 'ทำงาน'] },
      { id: 'people', labelKey: 'icon.people', d: 'M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2.5 20c.8-3.2 2.8-5 5.5-5s4.7 1.8 5.5 5M13.5 16c.7-.7 1.5-1 2.5-1 2.7 0 4.7 1.8 5.5 5', en: ['meeting', 'meet', 'standup', 'review', 'sync', 'call', 'interview', '1:1', 'team', 'catch-up'], th: ['ประชุม', 'นัดคุย', 'คุยงาน', 'สัมภาษณ์'] },
      { id: 'laptop', labelKey: 'icon.laptop', d: 'M5 6h14v9H5zM3 18.5h18M10 9l-2 2 2 2M14 9l2 2-2 2', en: ['code', 'coding', 'dev', 'deploy', 'program', 'programming', 'bug', 'pr', 'laptop', 'computer'], th: ['โค้ด', 'เขียนโปรแกรม', 'คอม'] },
      { id: 'mail', labelKey: 'icon.mail', d: 'M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5', en: ['email', 'mail', 'inbox', 'reply', 'send', 'letter'], th: ['อีเมล', 'เมล', 'ตอบ', 'จดหมาย'] },
      { id: 'book', labelKey: 'icon.book', d: 'M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5zM12 6v13.5', en: ['study', 'read', 'reading', 'book', 'homework', 'class', 'exam', 'lecture', 'problem', 'revise', 'learn', 'pages', 'stats', 'math', 'thesis', 'quiz'], th: ['อ่าน', 'เรียน', 'การบ้าน', 'สอบ', 'ติว', 'หนังสือ'] },
      { id: 'brush', labelKey: 'icon.brush', d: 'M14.5 4.5l5 5L12 17l-5-5zM7 12c-2.5 0-3.5 2-3.5 4.5 0 1.5-.5 2.5-1 3 3.5.5 7.5-.5 7.5-4.5', en: ['draw', 'drawing', 'design', 'paint', 'painting', 'sketch', 'create', 'art', 'craft'], th: ['วาด', 'ออกแบบ', 'ระบายสี', 'ศิลปะ'] },
    ],
  },
  {
    labelKey: 'icon.cat.health',
    icons: [
      { id: 'run', labelKey: 'icon.run', d: 'M14 5a1.6 1.6 0 100 .1M8 20l3-5 3 2v4M6.5 11l3-3h3.5l2 3.5 3 .5M11 15l1.5-7', en: ['run', 'running', 'jog', 'jogging', 'marathon', '5k', '10k'], th: ['วิ่ง'] },
      { id: 'gym', labelKey: 'icon.gym', d: 'M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12', en: ['gym', 'workout', 'exercise', 'lift', 'lifting', 'weights', 'training', 'pilates', 'swim', 'swimming'], th: ['ยิม', 'ออกกำลัง', 'เวท', 'ฟิตเนส', 'ว่ายน้ำ'] },
      { id: 'heart', labelKey: 'icon.heart', d: 'M12 20s-7.5-4.5-7.5-10A4.2 4.2 0 0112 7.5a4.2 4.2 0 017.5 2.5C19.5 15.5 12 20 12 20z', en: ['yoga', 'meditate', 'meditation', 'therapy', 'wellbeing', 'stretch', 'breathe', 'journal'], th: ['โยคะ', 'สมาธิ', 'ยืดเส้น', 'เดท'] },
      { id: 'pill', labelKey: 'icon.pill', d: 'M10.5 4.5a4.2 4.2 0 016 6l-6 6a4.2 4.2 0 01-6-6zM7.5 7.5l6 6', en: ['meds', 'medicine', 'medication', 'pill', 'vitamin', 'doctor', 'pharmacy', 'clinic', 'hospital'], th: ['ยา', 'วิตามิน', 'หาหมอ', 'คลินิก', 'โรงพยาบาล'] },
      { id: 'tooth', labelKey: 'icon.tooth', d: 'M7 4c2 0 3 1 5 1s3-1 5-1c2.5 0 3.5 2.5 3 5-.5 2.5-1.5 3.5-2 6.5-.4 2.5-1 5-2.5 5S14 16 12 16s-1.5 4.5-3.5 4.5S6.4 18 6 15.5C5.5 12.5 4.5 11.5 4 9c-.5-2.5.5-5 3-5z', en: ['dentist', 'dental', 'teeth', 'tooth', 'floss', 'braces'], th: ['ฟัน', 'ทันตแพทย์'] },
      { id: 'moon', labelKey: 'icon.moon', d: 'M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z', en: ['sleep', 'bed', 'bedtime', 'nap', 'rest'], th: ['นอน', 'งีบ', 'พักผ่อน'] },
    ],
  },
  {
    labelKey: 'icon.cat.home',
    icons: [
      { id: 'home', labelKey: 'icon.home', d: 'M4 11.5 12 4l8 7.5M6 10v9.5h12V10', en: ['home', 'house', 'clean', 'cleaning', 'laundry', 'chores', 'tidy', 'vacuum', 'trash', 'dishes'], th: ['บ้าน', 'ทำความสะอาด', 'ซักผ้า', 'ล้างจาน', 'ทิ้งขยะ'] },
      { id: 'leaf', labelKey: 'icon.leaf', d: 'M5 19C5 10 10 5 20 5c0 10-5 15-14 14zM5 19l8-8', en: ['plant', 'water', 'garden', 'gardening', 'flower', 'tree'], th: ['ต้นไม้', 'รดน้ำ', 'สวน', 'ดอกไม้'] },
      { id: 'cart', labelKey: 'icon.cart', d: 'M3 4h2.5l2 11h10.5l2-8H7M9.5 19.5a.8.8 0 100 .1M17 19.5a.8.8 0 100 .1', en: ['grocery', 'groceries', 'shopping', 'shop', 'buy', 'market', 'supermarket', 'errand'], th: ['ซื้อ', 'ตลาด', 'ช้อป', 'ห้าง', 'ซูเปอร์'] },
      { id: 'meal', labelKey: 'icon.meal', d: 'M7 3v7a2 2 0 002 2v9M11 3v7a2 2 0 01-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v3h3', en: ['lunch', 'dinner', 'breakfast', 'brunch', 'cook', 'cooking', 'eat', 'meal', 'food', 'restaurant'], th: ['ข้าว', 'อาหาร', 'ทำกับข้าว', 'กิน'] },
      { id: 'coffee', labelKey: 'icon.coffee', d: 'M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5zM16 10.5h1.5a2.5 2.5 0 010 5H16M8.5 3.5V6M12 3.5V6', en: ['coffee', 'cafe', 'café', 'tea', 'latte', 'break'], th: ['กาแฟ', 'คาเฟ่', 'ชา'] },
      { id: 'paw', labelKey: 'icon.paw', d: 'M12 13c-3 0-5 3-5 5 0 1.5 1.5 2 2.5 1.7 1-.3 1.7-.7 2.5-.7s1.5.4 2.5.7c1 .3 2.5-.2 2.5-1.7 0-2-2-5-5-5zM6 9a1.5 2 0 100 .1M18 9a1.5 2 0 100 .1M9.5 5a1.5 2 0 100 .1M14.5 5a1.5 2 0 100 .1', en: ['dog', 'cat', 'pet', 'vet', 'puppy', 'kitten', 'walk'], th: ['หมา', 'แมว', 'สัตว์เลี้ยง', 'สัตวแพทย์'] },
    ],
  },
  {
    labelKey: 'icon.cat.out',
    icons: [
      { id: 'plane', labelKey: 'icon.plane', d: 'M10.5 13.5 3.5 11 5 9.5l7.5.5 4-4c1-1 2.5-1.5 3.5-.5s.5 2.5-.5 3.5l-4 4 .5 7.5-1.5 1.5-2.5-7z', en: ['flight', 'fly', 'trip', 'travel', 'airport', 'holiday', 'vacation', 'pack'], th: ['บิน', 'เที่ยว', 'สนามบิน', 'ไฟลท์', 'เดินทาง'] },
      { id: 'car', labelKey: 'icon.car', d: 'M4 16v-4l2-5h12l2 5v4zM4 16v2.5M20 16v2.5M4 12h16M7.5 14.2h.1M16.5 14.2h.1', en: ['drive', 'car', 'pickup', 'commute', 'parking', 'taxi', 'grab'], th: ['ขับรถ', 'รถ', 'รับส่ง'] },
      { id: 'gift', labelKey: 'icon.gift', d: 'M4 9h16v4H4zM5.5 13v7h13v-7M12 9v11M12 9c-1-3-5-4-5-1.5S12 9 12 9zM12 9c1-3 5-4 5-1.5S12 9 12 9z', en: ['gift', 'present', 'wrap'], th: ['ของขวัญ', 'ของฝาก'] },
      { id: 'cake', labelKey: 'icon.cake', d: 'M5 12h14v8H5zM5 15.5c2 1.5 4.5 1.5 7 0s5-1.5 7 0M12 12V8.5M12 4.5c1 1 1 2.5 0 3-1-.5-1-2 0-3z', en: ['birthday', 'bday', 'cake', 'party', 'anniversary', 'celebrate'], th: ['วันเกิด', 'เค้ก', 'ปาร์ตี้', 'ครบรอบ'] },
      { id: 'money', labelKey: 'icon.money', d: 'M3.5 7h17v10h-17zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 10v4M17.5 10v4', en: ['bill', 'pay', 'rent', 'bank', 'tax', 'invoice', 'budget', 'salary', 'electricity', 'insurance'], th: ['จ่าย', 'บิล', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าเช่า', 'ธนาคาร', 'ภาษี', 'โอนเงิน'] },
      { id: 'music', labelKey: 'icon.music', d: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19 16a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', en: ['music', 'piano', 'guitar', 'practice', 'concert', 'sing', 'band', 'karaoke', 'violin'], th: ['ดนตรี', 'เปียโน', 'กีตาร์', 'ร้องเพลง', 'คอนเสิร์ต', 'ซ้อม'] },
    ],
  },
];

export const PLAN_ICONS: PlanIconDef[] = PLAN_ICON_CATEGORIES.flatMap((c) => c.icons);
const BY_ID = new Map(PLAN_ICONS.map((i) => [i.id, i]));

export function planIconDef(id: string | undefined | null): PlanIconDef | undefined {
  return id ? BY_ID.get(id as PlanIconId) : undefined;
}

function words(title: string) {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}:'-]+/u)
    .filter(Boolean)
    .map((w) => w.replace(/^[:'-]+|[:'-]+$/g, '').replace(/'s$/, ''))
    .filter(Boolean);
}

export interface IconMatch {
  id: PlanIconId;
  /** The word in the title that matched, as typed — shown as SUGGESTED FOR “RUN”. */
  keyword: string;
}

/**
 * Everyday verbs and broad words that also appear in more specific titles ("Call dentist",
 * "Design review", "Pay rent", "Walk to the gym"). A title's other matches outrank these.
 */
const WEAK = new Set(['call', 'design', 'create', 'send', 'reply', 'buy', 'pay', 'read', 'meet', 'sync', 'team', 'walk', 'water', 'eat', 'break', 'practice', 'work', 'project', 'class', 'pack', 'shop', 'plan', 'กิน']);

/** Icons whose keywords appear in `title`: specific words first, then in the order they appear. */
export function matchIcons(title: string): IconMatch[] {
  const lower = title.toLowerCase();
  const ws = words(title);
  const hits: { id: PlanIconId; keyword: string; at: number }[] = [];
  for (const icon of PLAN_ICONS) {
    let best: { keyword: string; at: number } | null = null;
    for (const kw of icon.en) {
      const wi = ws.findIndex((w) => w === kw || (w.endsWith('s') && w.slice(0, -1) === kw) || (w.endsWith('es') && w.slice(0, -2) === kw));
      if (wi === -1) continue;
      const at = lower.indexOf(ws[wi]);
      if (!best || at < best.at) best = { keyword: ws[wi], at };
    }
    for (const kw of icon.th) {
      const at = lower.indexOf(kw);
      if (at !== -1 && (!best || at < best.at)) best = { keyword: kw, at };
    }
    if (best) hits.push({ id: icon.id, ...best });
  }
  const rank = (h: { keyword: string; at: number }) => (WEAK.has(h.keyword.replace(/s$/, '')) ? 1e4 : 0) + h.at;
  return hits.sort((a, b) => rank(a) - rank(b)).map(({ id, keyword }) => ({ id, keyword }));
}

/** The icon a plan shows: the one the user picked, else the first one its title suggests (user's call, 2026-10-18), else none. */
export function resolvePlanIcon(plan: Pick<Plan, 'icon' | 'name'>): PlanIconId | null {
  return planIconDef(plan.icon)?.id ?? matchIcons(plan.name)[0]?.id ?? null;
}

/**
 * How often each icon is used across the user's saved plans (a repeating series counts once).
 * Drives the Choose icon sheet's RECENT row.
 */
export function iconUsage(plans: Plan[]): Map<PlanIconId, number> {
  const seenSeries = new Set<string>();
  const counts = new Map<PlanIconId, number>();
  for (const p of plans) {
    const def = planIconDef(p.icon);
    if (!def) continue;
    if (p.repeatId) {
      if (seenSeries.has(p.repeatId)) continue;
      seenSeries.add(p.repeatId);
    }
    counts.set(def.id, (counts.get(def.id) ?? 0) + 1);
  }
  return counts;
}

/** Everyday picks that top up RECENT until the user has used 6 icons (one from each corner of the set, not a copy of the first category). */
const STARTER: PlanIconId[] = ['run', 'people', 'work', 'book', 'coffee', 'cart', 'meal', 'moon', 'home', 'money'];

/** The 6 most-used icons, highest count first, topped up with STARTER when the user hasn't used 6 yet. */
export function recentIcons(usage: Map<PlanIconId, number>, n = 6): PlanIconId[] {
  const used = [...usage.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const fill = [...STARTER, ...PLAN_ICONS.map((i) => i.id)].filter((id, i, all) => !used.includes(id) && all.indexOf(id) === i);
  return [...used, ...fill].slice(0, n);
}

/**
 * Six suggestions for the New plan Icon card: the picked icon, icons the title matches, then the
 * rest of the first match's category, then the user's most-used icons.
 */
export function suggestIcons(title: string, usage: Map<PlanIconId, number>, picked?: string, n = 6): { keyword: string | null; ids: PlanIconId[] } {
  const matches = matchIcons(title);
  const out: PlanIconId[] = matches.map((m) => m.id);
  const cat = matches.length ? PLAN_ICON_CATEGORIES.find((c) => c.icons.some((i) => i.id === matches[0].id)) : undefined;
  for (const id of [...(cat?.icons.map((i) => i.id) ?? []), ...recentIcons(usage, PLAN_ICONS.length)]) {
    if (out.length >= n) break;
    if (!out.includes(id)) out.push(id);
  }
  // An icon picked from the full sheet that isn't already here leads the row, so the selection is
  // always visible (one picked from this row stays where it is).
  const pickedId = planIconDef(picked)?.id;
  const ids = pickedId && !out.slice(0, n).includes(pickedId) ? [pickedId, ...out] : out;
  return { keyword: matches[0]?.keyword ?? null, ids: ids.slice(0, n) };
}
