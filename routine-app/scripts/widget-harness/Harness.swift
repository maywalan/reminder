// Throwaway SwiftUI app that lays every Tickle widget family out on a wallpaper so they can be
// screenshotted in the simulator — the iOS 18.6 sim crashes SpringBoard when a widget is placed,
// and Xcode's canvas keeps cancelling preview builds for this Expo project. Run ./run.sh.
import SwiftUI
import WidgetKit
import CoreText

private let now = Calendar.current.date(bySettingHour: 13, minute: 30, second: 0, of: .now)!

private var sample: CalData {
  func day(_ o: Int) -> String { CalDay.iso(CalDay.add(o, to: now)) }
  func p(_ id: String, _ t: String, _ o: Int, _ time: String, _ c: String, allDay: Bool = false, done: Bool = false) -> CalPlan {
    CalPlan(id: id, title: t, date: day(o), time: time, allDay: allDay, color: c, done: done, timeLabel: allDay ? "All day" : CalDay.twelveHour(time))
  }
  return CalData(plans: [
    p("1", "Design review", 0, "14:00", "#7B61FF"), p("2", "Stats set", 0, "16:30", "#A455D6"),
    p("3", "Dentist", 0, "09:00", "#17A8A0", allDay: true), p("4", "Team lunch", 1, "12:00", "#7B61FF"),
    p("5", "Yoga", 1, "18:00", "#17A8A0", done: true), p("6", "Water plants", 2, "08:00", "#F0A32E"),
    p("7", "Gym", -2, "07:00", "#35B978"), p("8", "Run 5k", -8, "06:30", "#17A8A0", done: true),
    p("9", "Weekly sync", -10, "10:00", "#7B61FF"), p("10", "Mei's birthday", 4, "09:00", "#E0616F", allDay: true),
    p("11", "Stats quiz", 4, "13:00", "#A455D6"), p("12", "Pick up parcel", 6, "17:00", "#17A8A0"),
    p("13", "Date night", 8, "19:00", "#E0616F"), p("14", "Laundry", 8, "10:00", "#F0A32E"), p("15", "Call mom", 8, "20:00", "#35B978"),
  ], holidays: [day(-13): "Holiday", day(3): "Holiday"])
}
private let entry = CalEntry(date: now, data: sample)
private let emptyEntry = CalEntry(date: now, data: CalData())

private struct HomeFrame<V: View>: View {
  let w: CGFloat, h: CGFloat, label: String
  @ViewBuilder var content: V
  var body: some View {
    VStack(spacing: 6) {
      content
        .frame(width: w, height: h)
        .background(
          ZStack {
            LinearGradient(colors: [Color(hex: "#1D2444"), Color(hex: "#2C3158")], startPoint: .top, endPoint: .bottom)
            RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
          })
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
      Text(label).font(.system(size: 12, weight: .medium)).foregroundStyle(.white)
    }
  }
}

private struct LockPlate<V: View>: View {
  let w: CGFloat, h: CGFloat, circle: Bool
  @ViewBuilder var content: V
  var body: some View {
    content.frame(width: w, height: h)
      .background {
        if circle { Circle().fill(Color.white.opacity(0.18)) } else { RoundedRectangle(cornerRadius: 18).fill(Color.white.opacity(0.18)) }
      }
  }
}

struct HarnessView: View {
  let page: Int
  var body: some View {
    ZStack {
      LinearGradient(colors: [Color(hex: "#2C52A6"), Color(hex: "#7D86D6"), Color(hex: "#C9B2E4"), Color(hex: "#EDCADB")], startPoint: .top, endPoint: .bottom)
        .ignoresSafeArea()
      VStack(spacing: 22) {
        switch page {
        case 1:
          HomeFrame(w: 338, h: 354, label: "Calendar · large") { CalendarGridWidgetView(entry: entry, familyOverride: .systemLarge) }
          HomeFrame(w: 338, h: 158, label: "Calendar · medium (empty day)") { CalendarGridWidgetView(entry: emptyEntry, familyOverride: .systemMedium) }
        case 2:
          HomeFrame(w: 338, h: 158, label: "Calendar · medium") { CalendarGridWidgetView(entry: entry, familyOverride: .systemMedium) }
          HStack(spacing: 22) {
            HomeFrame(w: 158, h: 158, label: "Today") { TodaySmallWidgetView(entry: entry) }
            HomeFrame(w: 158, h: 158, label: "Next 3 days") { Next3SmallWidgetView(entry: entry) }
          }
          HStack(spacing: 22) {
            HomeFrame(w: 158, h: 158, label: "Today (empty)") { TodaySmallWidgetView(entry: emptyEntry) }
            Color.clear.frame(width: 158, height: 158)
          }
        default:
          Text("1:30").font(.system(size: 96, weight: .bold)).foregroundStyle(.white.opacity(0.9))
          LockWidgetView(entry: entry, familyOverride: .accessoryInline).foregroundStyle(.white).frame(height: 20)
          HStack(spacing: 14) {
            LockPlate(w: 160, h: 72, circle: false) { LockWidgetView(entry: entry, familyOverride: .accessoryRectangular) }
            LockPlate(w: 72, h: 72, circle: true) { LockWidgetView(entry: entry, familyOverride: .accessoryCircular) }
            LockPlate(w: 72, h: 72, circle: true) { DateCircleWidgetView(entry: entry) }
          }
          Text("empty day").font(.system(size: 12, weight: .medium)).foregroundStyle(.white)
          LockWidgetView(entry: emptyEntry, familyOverride: .accessoryInline).foregroundStyle(.white).frame(height: 20)
          HStack(spacing: 14) {
            LockPlate(w: 160, h: 72, circle: false) { LockWidgetView(entry: emptyEntry, familyOverride: .accessoryRectangular) }
            LockPlate(w: 72, h: 72, circle: true) { LockWidgetView(entry: emptyEntry, familyOverride: .accessoryCircular) }
          }
        }
      }
    }
  }
}

@main
struct HarnessApp: App {
  init() {
    for name in ["Anuphan_400Regular", "Anuphan_500Medium", "Anuphan_600SemiBold", "Anuphan_700Bold"] {
      if let url = Bundle.main.url(forResource: name, withExtension: "ttf") {
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
      }
    }
  }
  var body: some Scene {
    WindowGroup { HarnessView(page: UserDefaults.standard.integer(forKey: "page")) }
  }
}
