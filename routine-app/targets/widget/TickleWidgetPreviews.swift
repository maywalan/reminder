#if DEBUG
import SwiftUI
import WidgetKit

// Xcode canvas previews for every widget family — the iOS 18.6 simulator's SpringBoard crashes when
// a widget is dropped on the Home Screen, so this is where the widgets get checked placed and sized.
// Open this file in Xcode and turn on the canvas (Editor ▸ Canvas). Data is the handoff's sample
// month (busy days, overflow, a done plan, holidays), with "now" at 1:30 PM so "Next" has something
// to show.

private enum PreviewData {
  static let now = Calendar.current.date(bySettingHour: 13, minute: 30, second: 0, of: .now)!

  static var data: CalData {
    let th = TickleL10n.isThai
    func day(_ offset: Int) -> String { CalDay.iso(CalDay.add(offset, to: now)) }
    func p(_ id: String, _ en: String, _ thai: String, _ offset: Int, _ time: String, _ color: String, allDay: Bool = false, done: Bool = false) -> CalPlan {
      let label = allDay ? (th ? "ทั้งวัน" : "All day") : (th ? time : CalDay.twelveHour(time))
      return CalPlan(id: id, title: th ? thai : en, date: day(offset), time: time, allDay: allDay, color: color, done: done, timeLabel: label)
    }
    return CalData(
      plans: [
        p("1", "Design review", "ประชุมงานดีไซน์", 0, "14:00", "#7B61FF"),
        p("2", "Stats set", "ทำโจทย์สถิติ", 0, "16:30", "#A455D6"),
        p("3", "Dentist", "หาหมอฟัน", 0, "09:00", "#17A8A0", allDay: true),
        p("4", "Team lunch", "กินข้าวกับทีม", 1, "12:00", "#7B61FF"),
        p("5", "Yoga", "โยคะ", 1, "18:00", "#17A8A0", done: true),
        p("6", "Water plants", "รดน้ำต้นไม้", 2, "08:00", "#F0A32E"),
        p("7", "Gym", "เข้ายิม", -2, "07:00", "#35B978"),
        p("8", "Run 5k", "วิ่ง 5 กม.", -8, "06:30", "#17A8A0", done: true),
        p("9", "Weekly sync", "ประชุมประจำสัปดาห์", -10, "10:00", "#7B61FF"),
        p("10", "Mei's birthday", "วันเกิดเหมย", 4, "09:00", "#E0616F", allDay: true),
        p("11", "Stats quiz", "สอบย่อยสถิติ", 4, "13:00", "#A455D6"),
        p("12", "Pick up parcel", "ไปรับพัสดุ", 6, "17:00", "#17A8A0"),
        p("13", "Date night", "เดตกลางคืน", 8, "19:00", "#E0616F"),
        p("14", "Laundry", "ซักผ้า", 8, "10:00", "#F0A32E"),
        p("15", "Call mom", "โทรหาแม่", 8, "20:00", "#35B978"),
      ],
      holidays: [day(-13): "Labour Day", day(3): "Holiday"])
  }

  static var entries: [CalEntry] { [CalEntry(date: now, data: data)] }
  static var empty: [CalEntry] { [CalEntry(date: now, data: CalData())] }
}

@available(iOS 17.0, *)
#Preview("Today", as: .systemSmall) {
  TickleWidget()
} timeline: {
  PreviewData.entries[0]
  PreviewData.empty[0]
}

@available(iOS 17.0, *)
#Preview("Next 3 days", as: .systemSmall) {
  TickleNext3Widget()
} timeline: {
  PreviewData.entries[0]
}

@available(iOS 17.0, *)
#Preview("Calendar · medium", as: .systemMedium) {
  TickleCalendarWidget()
} timeline: {
  PreviewData.entries[0]
  PreviewData.empty[0]
}

@available(iOS 17.0, *)
#Preview("Calendar · large", as: .systemLarge) {
  TickleCalendarWidget()
} timeline: {
  PreviewData.entries[0]
}

@available(iOS 17.0, *)
#Preview("Up next · rectangular", as: .accessoryRectangular) {
  TickleLockWidget()
} timeline: {
  PreviewData.entries[0]
  PreviewData.empty[0]
}

@available(iOS 17.0, *)
#Preview("Up next · inline", as: .accessoryInline) {
  TickleLockWidget()
} timeline: {
  PreviewData.entries[0]
}

@available(iOS 17.0, *)
#Preview("To-do ring", as: .accessoryCircular) {
  TickleLockWidget()
} timeline: {
  PreviewData.entries[0]
}

@available(iOS 17.0, *)
#Preview("Date", as: .accessoryCircular) {
  TickleDateWidget()
} timeline: {
  PreviewData.entries[0]
}
#endif
