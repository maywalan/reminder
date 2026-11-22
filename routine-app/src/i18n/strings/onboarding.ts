import type { Entry } from './types';

/**
 * Onboarding "learn by doing" (design: Tickle onboarding.pdf, 2026-11-22). Five screens: Welcome,
 * Tap +, New Plan, Live Activity, Notification + widgets. Thai is written to read natively; step
 * labels carry their own casing because Thai has no uppercase.
 */
const onboarding = {
  // 01 · Welcome
  'onb.hi': { en: "Hi, I'm Tickle.", th: 'สวัสดี เราคือ Tickle' },
  'onb.intro': { en: "I help small routines stick. Here's how we'll work together.", th: 'เราช่วยให้เรื่องเล็กๆ ในแต่ละวันทำได้ต่อเนื่อง\nมาดูกันว่าเราจะช่วยกันยังไง' },
  'onb.loop1Title': { en: 'Add a plan', th: 'เพิ่มแผน' },
  'onb.loop1Body': { en: 'Tap +. Pick a title, icon and time.', th: 'แตะ + แล้วตั้งชื่อ เลือกไอคอนกับเวลา' },
  'onb.loop2Title': { en: 'Get nudged', th: 'สะกิดเตือนให้' },
  'onb.loop2Body': { en: 'A Live Activity counts down to it.', th: 'Live Activity นับถอยหลังให้จนถึงเวลา' },
  'onb.loop3Title': { en: 'Stay on track', th: 'ไม่หลุดแผน' },
  'onb.loop3Body': { en: 'Notification and widget keep it in sight.', th: 'การแจ้งเตือนกับวิดเจ็ตช่วยให้เห็นแผนตลอด' },
  'onb.start': { en: "Let's add your first plan", th: 'มาเพิ่มแผนแรกกัน' },
  'onb.haveAccount': { en: 'I already have an account', th: 'มีบัญชีอยู่แล้ว' },
  'onb.skip': { en: 'Skip', th: 'ข้าม' },
  'onb.back': { en: 'Back', th: 'ย้อนกลับ' },
  'onb.progress': { en: 'Step {n} of 4', th: 'ขั้นที่ {n} จาก 4' },

  // 02 · Tap +
  'onb.step1': { en: 'STEP 1 · ADD A PLAN', th: 'ขั้นที่ 1 · เพิ่มแผน' },
  'onb.tapTitle': { en: 'Tap + to add a plan', th: 'แตะ + เพื่อเพิ่มแผน' },
  'onb.tapBody': { en: 'This is Home. Every plan you make starts with this one button.', th: 'นี่คือหน้าหลัก ทุกแผนเริ่มจากปุ่มนี้ปุ่มเดียว' },
  'onb.guest': { en: 'Guest', th: 'ผู้เยี่ยมชม' },
  'onb.nothingPlanned': { en: 'Nothing planned', th: 'ยังไม่มีแผน' },
  'onb.nothingPlannedSub': { en: "Add one and I'll nudge you.", th: 'เพิ่มสักแผน แล้วเราจะสะกิดเตือนให้' },
  'onb.nothingComing': { en: 'Nothing coming up', th: 'ยังไม่มีแผนถัดไป' },
  'onb.tryPlus': { en: 'Tap the + to try it', th: 'ลองแตะ + ดูสิ' },

  // 03 · New Plan
  'onb.sampleName': { en: 'Morning stretch', th: 'ยืดเส้นตอนเช้า' },
  'onb.namePlaceholder': { en: 'What do you want to do?', th: 'อยากทำอะไรดี' },
  'onb.iconSub': { en: 'Pick one for this plan', th: 'เลือกไอคอนให้แผนนี้' },
  'onb.date': { en: 'DATE', th: 'วันที่' },
  'onb.time': { en: 'TIME', th: 'เวลา' },
  'onb.start_': { en: 'START', th: 'เริ่ม' },
  'onb.end': { en: 'END', th: 'จบ' },
  'onb.repeatNone': { en: 'Never', th: 'ไม่ทำซ้ำ' },
  'onb.repeatDaily': { en: 'Every day', th: 'ทุกวัน' },
  'onb.repeatWeekdays': { en: 'Weekdays', th: 'วันธรรมดา' },
  'onb.repeatWeekly': { en: 'Every week', th: 'ทุกสัปดาห์' },
  'onb.liveSub': { en: 'Counts down on your Lock Screen and Dynamic Island until it starts.', th: 'นับถอยหลังบนหน้าจอล็อกและ Dynamic Island จนถึงเวลาเริ่ม' },
  'onb.addPlan': { en: 'Add plan', th: 'เพิ่มแผน' },
  'onb.nameNeeded': { en: 'Give your plan a name first.', th: 'ตั้งชื่อแผนก่อนนะ' },

  // 04 · Live Activity
  'onb.step2': { en: 'STEP 2 · GET NUDGED', th: 'ขั้นที่ 2 · สะกิดเตือน' },
  'onb.countTitle': { en: 'Watch it count down', th: 'นับถอยหลังให้เห็นชัดๆ' },
  'onb.countBody': { en: "Tickle counts down on your Lock Screen and Dynamic Island. When it's time, tap Done.", th: 'Tickle นับถอยหลังให้บนหน้าจอล็อกและ Dynamic Island พอถึงเวลาก็แตะ "เสร็จ"' },
  'onb.countingDown': { en: 'Counting down', th: 'กำลังนับถอยหลัง' },
  'onb.whenTime': { en: "When it's time", th: 'พอถึงเวลา' },
  'onb.starts': { en: 'Starts {time}', th: 'เริ่ม {time}' },
  'onb.reminderAt': { en: 'Reminder · {time}', th: 'เตือน · {time}' },
  'onb.allDayReminder': { en: 'Reminder · All day', th: 'เตือน · ทั้งวัน' },
  'onb.now': { en: 'Now', th: 'ถึงแล้ว' },
  'onb.turnOn': { en: 'Turn on reminders', th: 'เปิดการเตือน' },
  'onb.notNow': { en: 'Not now', th: 'ไว้ทีหลัง' },

  // 05 · Notification + widgets
  'onb.step3': { en: 'STEP 3 · STAY ON TRACK', th: 'ขั้นที่ 3 · ไม่หลุดแผน' },
  'onb.sightTitle': { en: 'Your plan stays in sight', th: 'เห็นแผนได้ตลอด' },
  'onb.sightBody': { en: 'A nudge first, then a widget for a one-glance day.', th: 'สะกิดเตือนก่อนถึงเวลา แล้วดูทั้งวันได้ในแวบเดียวด้วยวิดเจ็ต' },
  'onb.notifNow': { en: 'now', th: 'ตอนนี้' },
  'onb.small': { en: 'Small', th: 'เล็ก' },
  'onb.medium': { en: 'Medium', th: 'กลาง' },
  'onb.large': { en: 'Large', th: 'ใหญ่' },
  'onb.today': { en: 'Today', th: 'วันนี้' },
  'onb.next3': { en: 'Next 3 days', th: '3 วันข้างหน้า' },
  'onb.plansToday': { en: '{count} plans today', th: 'วันนี้ {count} แผน' },
  'onb.plansToday_one': { en: '1 plan today', th: 'วันนี้ 1 แผน' },
  'onb.freeDay': { en: 'Free day', th: 'ว่างทั้งวัน' },
  'onb.goHome': { en: 'Go to Home', th: 'ไปหน้าหลัก' },
} satisfies Record<string, Entry>;

export default onboarding;
