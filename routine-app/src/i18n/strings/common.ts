import type { Entry } from './types';

export default {
  'tab.home': { en: 'Home', th: 'หน้าหลัก' },
  'tab.calendar': { en: 'Calendar', th: 'ปฏิทิน' },
  'tab.progress': { en: 'Progress', th: 'สถิติ' },
  'tab.profile': { en: 'Profile', th: 'โปรไฟล์' },

  'common.cancel': { en: 'Cancel', th: 'ยกเลิก' },
  'common.delete': { en: 'Delete', th: 'ลบ' },
  'common.done': { en: 'Done', th: 'เสร็จ' },
  'common.close': { en: 'Close', th: 'ปิด' },
  'common.save': { en: 'Save', th: 'บันทึก' },
  'common.ok': { en: 'OK', th: 'โอเค' },
  'common.allDay': { en: 'All Day', th: 'ทั้งวัน' },
  'common.more': { en: '+{n} more', th: 'อีก {n}' },
  'common.dismiss': { en: 'Dismiss', th: 'ปิด' },
  'common.selectAll': { en: 'Select All', th: 'เลือกทั้งหมด' },
  'common.of': { en: '{n} of {total}', th: '{n} จาก {total}' },

  'plan.deleteTitle': { en: 'Delete Plan?', th: 'ลบแผนนี้ไหม?' },
  'plan.deleteBody': { en: '"{name}" will be deleted.', th: '"{name}" จะถูกลบ' },
  'plans.deleteTitle': { en: 'Delete Plans?', th: 'ลบแผนที่เลือกไหม?' },
  'plans.deleteBody': { en: '{count} plans will be deleted.', th: 'จะลบ {count} แผน' },
  'plans.deleteBody_one': { en: '1 plan will be deleted.', th: 'จะลบ 1 แผน' },
  'plan.alert': { en: 'Alert', th: 'แจ้งเตือน' },
  'plan.alerts': { en: '{count} Alerts', th: 'แจ้งเตือน {count} ครั้ง' },

  'date.tomorrow': { en: 'Tomorrow', th: 'พรุ่งนี้' },
  'date.yesterday': { en: 'Yesterday', th: 'เมื่อวาน' },

  'period.week': { en: 'Week', th: 'สัปดาห์' },
  'period.month': { en: 'Month', th: 'เดือน' },
  'period.year': { en: 'Year', th: 'ปี' },

  'calendar.todayLabel': { en: 'Today, {date}', th: 'วันนี้ · {date}' },
  'calendar.emptyDay': { en: 'No plans on this day. Tap the date again to add one.', th: 'ยังไม่มีแผนในวันนั้น แตะวันที่อีกครั้งเพื่อเพิ่มเลย' },
  'calendar.noPlans': { en: 'No plans', th: 'ไม่มีแผน' },
  'calendar.addOn': { en: 'Add a plan on {day}', th: 'เพิ่มแผนวัน {day}' },

  'todo.live': { en: 'Live', th: 'Live' },
  'splash.tagline': { en: 'a friendly nudge, on time', th: 'สะกิดเตือนเบาๆ ตรงเวลา' },

  'notif.startingNow': { en: 'Starting now', th: 'เริ่มแล้วตอนนี้' },
  'notif.inMin': { en: 'Starting in {n} min', th: 'เริ่มในอีก {n} นาที' },
  'notif.inHr': { en: 'Starting in {n} hr', th: 'เริ่มในอีก {n} ชม.' },
  'notif.inDays': { en: 'Starting in {count} days', th: 'เริ่มในอีก {count} วัน' },
  'notif.inDays_one': { en: 'Starting in 1 day', th: 'เริ่มในอีก 1 วัน' },
  'notif.nothingToday': { en: 'Nothing on your plan today.', th: 'วันนี้ไม่มีแผนอะไร' },
  'notif.more': { en: ', +{n} more', th: ' และอีก {n} อย่าง' },
  'notif.todayAgenda': { en: "Today's Agenda", th: 'แผนวันนี้' },
  'notif.tomorrowAgenda': { en: "Tomorrow's Agenda", th: 'แผนพรุ่งนี้' },

  'widget.nothingToday': { en: 'Nothing planned today', th: 'วันนี้ยังว่างอยู่' },
  'photo.close': { en: 'Close photo', th: 'ปิดรูป' },
} satisfies Record<string, Entry>;
