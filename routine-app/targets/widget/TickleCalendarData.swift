import SwiftUI
import WidgetKit

let tickleAppGroup = "group.com.maywalan.tickle"

/// One plan as the RN side writes it into the App Group (src/lib/widget-sync.ts → `calendarData`).
/// `date`/`time` are the plan's own wall-clock strings ("2026-05-14" / "14:00"); `timeLabel` is
/// already formatted in the app's language ("2:00 PM" / "14:00" / "All day").
struct CalPlan: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let date: String
  let time: String
  let allDay: Bool
  let color: String
  let done: Bool
  let timeLabel: String

  /// Start as a Date in the phone's current zone, nil for all-day plans.
  var start: Date? {
    guard !allDay else { return nil }
    return CalDay.parse(date, time: time)
  }

  /// "2:00 PM" → "2:00" for the tight spots (small Today, lock-screen sub line). Thai is 24h already.
  var shortTime: String {
    guard !allDay else { return timeLabel }
    return timeLabel.replacingOccurrences(of: " AM", with: "").replacingOccurrences(of: " PM", with: "")
  }
}

struct CalData: Codable {
  var plans: [CalPlan] = []
  /// ISO date → public holiday name, for the years the plans window covers.
  var holidays: [String: String] = [:]

  /// Plans on one ISO day: timed by start time, then all-day (handoff "Ordering inside a day").
  func plans(on iso: String) -> [CalPlan] {
    plans.filter { $0.date == iso }.sorted { a, b in
      if a.allDay != b.allDay { return !a.allDay }
      return a.time < b.time
    }
  }

  /// Timed, not-done plans that start at or after `date`, soonest first — what "Next" reads.
  func upcoming(after date: Date) -> [CalPlan] {
    plans.filter { !$0.done && ($0.start.map { $0 >= date } ?? false) }
      .sorted { $0.start! < $1.start! }
  }

  static func load() -> CalData {
    guard let raw = UserDefaults(suiteName: tickleAppGroup)?.data(forKey: "calendarData"),
      let decoded = try? JSONDecoder().decode(CalData.self, from: raw)
    else { return CalData() }
    return decoded
  }

  /// Gallery preview / placeholder content — the handoff's sample day.
  static func sample(today: Date) -> CalData {
    let iso = CalDay.iso(today)
    let tomorrow = CalDay.iso(CalDay.add(1, to: today))
    let th = TickleL10n.isThai
    func p(_ id: String, _ title: String, _ date: String, _ time: String, _ color: String, allDay: Bool = false, done: Bool = false) -> CalPlan {
      let label = allDay ? (th ? "ทั้งวัน" : "All day") : (th ? time : CalDay.twelveHour(time))
      return CalPlan(id: id, title: title, date: date, time: time, allDay: allDay, color: color, done: done, timeLabel: label)
    }
    return CalData(plans: [
      p("s1", th ? "ประชุมงานดีไซน์" : "Design review", iso, "14:00", "#7B61FF"),
      p("s2", th ? "ทำโจทย์สถิติ" : "Stats set", iso, "16:30", "#A455D6"),
      p("s3", th ? "หาหมอฟัน" : "Dentist", iso, "09:00", "#17A8A0", allDay: true),
      p("s4", th ? "กินข้าวกับทีม" : "Team lunch", tomorrow, "12:00", "#7B61FF"),
      p("s5", th ? "โยคะ" : "Yoga", tomorrow, "18:00", "#17A8A0", done: true),
    ])
  }
}

/// Date helpers on the phone's local calendar, Sunday-first like the app's Calendar screen.
enum CalDay {
  static var cal: Calendar {
    var c = Calendar(identifier: .gregorian)
    c.firstWeekday = 1
    return c
  }

  static func iso(_ d: Date) -> String {
    let c = cal.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
  }

  static func parse(_ iso: String, time: String = "00:00") -> Date? {
    let d = iso.split(separator: "-").compactMap { Int($0) }
    let t = time.split(separator: ":").compactMap { Int($0) }
    guard d.count == 3, t.count >= 2 else { return nil }
    return cal.date(from: DateComponents(year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1]))
  }

  static func add(_ days: Int, to d: Date) -> Date { cal.date(byAdding: .day, value: days, to: d)! }
  static func startOfDay(_ d: Date) -> Date { cal.startOfDay(for: d) }
  static func day(_ d: Date) -> Int { cal.component(.day, from: d) }
  static func month(_ d: Date) -> Int { cal.component(.month, from: d) - 1 }
  static func year(_ d: Date) -> Int { cal.component(.year, from: d) }
  static func weekday(_ d: Date) -> Int { cal.component(.weekday, from: d) - 1 }

  /// Sunday on or before `d`.
  static func weekStart(_ d: Date) -> Date { add(-weekday(d), to: startOfDay(d)) }

  /// 42 days: the Sunday-first 6-week grid that holds `d`'s month.
  static func monthGrid(_ d: Date) -> [Date] {
    let first = cal.date(from: cal.dateComponents([.year, .month], from: d))!
    let start = weekStart(first)
    return (0..<42).map { add($0, to: start) }
  }

  static func twelveHour(_ time: String) -> String {
    let t = time.split(separator: ":").compactMap { Int($0) }
    guard t.count >= 2 else { return time }
    let h12 = t[0] % 12 == 0 ? 12 : t[0] % 12
    return String(format: "%d:%02d %@", h12, t[1], t[0] >= 12 ? "PM" : "AM")
  }
}

/// Words + date formats for the calendar widgets, mirroring src/i18n/format.ts (Thai: day-first,
/// Buddhist Era years, dotted short months).
enum CalText {
  private static var th: Bool { TickleL10n.isThai }

  static let monthLongEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  static let monthLongTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
  static let monthShortEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  static let monthShortTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
  static let weekdayShortEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  static let weekdayShortTH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
  static let weekdayLetterEN = ["S", "M", "T", "W", "T", "F", "S"]
  static let weekdayLetterTH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

  static var weekdayLetters: [String] { th ? weekdayLetterTH : weekdayLetterEN }
  static func weekdayShort(_ d: Date) -> String { (th ? weekdayShortTH : weekdayShortEN)[CalDay.weekday(d)] }
  static func monthShort(_ d: Date) -> String { (th ? monthShortTH : monthShortEN)[CalDay.month(d)] }
  static func displayYear(_ d: Date) -> Int { CalDay.year(d) + (th ? 543 : 0) }

  /// "May 2026" / "พฤษภาคม 2569"
  static func monthTitle(_ d: Date) -> String {
    "\((th ? monthLongTH : monthLongEN)[CalDay.month(d)]) \(displayYear(d))"
  }

  /// "May 10 – 23", "May 31 – Jun 13" / "10 – 23 พ.ค.", "31 พ.ค. – 13 มิ.ย."
  static func rangeTitle(_ a: Date, _ b: Date) -> String {
    let sameMonth = CalDay.month(a) == CalDay.month(b)
    if th {
      return sameMonth
        ? "\(CalDay.day(a)) – \(CalDay.day(b)) \(monthShort(b))"
        : "\(CalDay.day(a)) \(monthShort(a)) – \(CalDay.day(b)) \(monthShort(b))"
    }
    return sameMonth
      ? "\(monthShort(a)) \(CalDay.day(a)) – \(CalDay.day(b))"
      : "\(monthShort(a)) \(CalDay.day(a)) – \(monthShort(b)) \(CalDay.day(b))"
  }

  static func plansToday(_ n: Int) -> String {
    if n == 0 { return th ? "วันนี้ว่าง" : "Free today" }
    if th { return "วันนี้ \(n) แผน" }
    return n == 1 ? "1 plan today" : "\(n) plans today"
  }

  static func more(_ n: Int) -> String { th ? "อีก \(n)" : "+\(n) more" }
  static var today: String { th ? "วันนี้" : "Today" }
  static var tomorrow: String { th ? "พรุ่งนี้" : "Tomorrow" }
  static var next: String { th ? "ถัดไป" : "Next" }
  static func then(_ title: String, _ time: String) -> String { th ? "ต่อด้วย \(title) · \(time)" : "then \(title) · \(time)" }
  static var nothingPlanned: String { th ? "ยังไม่มีแผน" : "Nothing planned" }
  static var addPlan: String { th ? "+ เพิ่มแผน" : "+ Add a plan" }
  static var restFree: String { th ? "ที่เหลือวันนี้ว่างแล้ว" : "The rest of today is free." }
  static var restFreeShort: String { th ? "ว่างแล้ว" : "All clear" }
  static var toDo: String { th ? "ต้องทำ" : "to do" }

  static var calendarName: String { th ? "ปฏิทิน" : "Calendar" }
  static var calendarDescription: String { th ? "ดูแผนทั้งเดือนหรือสองสัปดาห์ในแวบเดียว" : "Your month or next two weeks at a glance." }
  static var todayName: String { th ? "วันนี้" : "Today" }
  static var todayDescription: String { th ? "แผนของวันนี้พร้อมเวลา" : "Today's plans with their times." }
  static var next3Name: String { th ? "3 วันข้างหน้า" : "Next 3 days" }
  static var next3Description: String { th ? "วันนี้ พรุ่งนี้ และมะรืน" : "Today, tomorrow and the day after." }
  static var lockName: String { th ? "แผนถัดไป" : "Up next" }
  static var lockDescription: String { th ? "แผนถัดไปและสิ่งที่ต้องทำวันนี้" : "Your next plan and what's left today." }
  static var dateName: String { th ? "วันที่" : "Date" }
  static var dateDescription: String { th ? "วันที่วันนี้" : "Today's date." }
}

/// Deep links the app's Calendar tab understands (src/app/(tabs)/calendar.tsx reads the params).
/// They always land on a tab first, so any plan sheet opens on top of it — never orphaned.
enum CalLink {
  static func day(_ iso: String) -> URL { URL(string: "tickle://calendar?date=\(iso)")! }
  static func plan(_ p: CalPlan) -> URL { URL(string: "tickle://calendar?date=\(p.date)&plan=\(p.id.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? p.id)")! }
  static func add(_ iso: String) -> URL { URL(string: "tickle://calendar?date=\(iso)&add=1")! }
}

struct CalEntry: TimelineEntry {
  let date: Date
  let data: CalData
  var todayISO: String { CalDay.iso(date) }
}

struct CalProvider: TimelineProvider {
  func placeholder(in context: Context) -> CalEntry {
    CalEntry(date: .now, data: .sample(today: .now))
  }

  func getSnapshot(in context: Context, completion: @escaping (CalEntry) -> Void) {
    let data = CalData.load()
    // Gallery preview before the app has synced anything: show the sample day instead of a blank grid.
    completion(CalEntry(date: .now, data: context.isPreview && data.plans.isEmpty ? .sample(today: .now) : data))
  }

  /// One entry now, one just after each upcoming plan starts (so "Next" moves on), and one at each
  /// of the next two midnights (rolls "today"). The app also reloads every timeline whenever plans
  /// change, so this only has to cover the stretch where the app stays closed.
  func getTimeline(in context: Context, completion: @escaping (Timeline<CalEntry>) -> Void) {
    let data = CalData.load()
    let now = Date()
    let horizon = CalDay.add(2, to: CalDay.startOfDay(now))
    var dates: Set<Date> = [CalDay.add(1, to: CalDay.startOfDay(now)), horizon]
    for p in data.upcoming(after: now) {
      guard let s = p.start, s < horizon else { break }
      dates.insert(s.addingTimeInterval(60))
    }
    let entries = [CalEntry(date: now, data: data)] + dates.sorted().prefix(40).map { CalEntry(date: $0, data: data) }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}
