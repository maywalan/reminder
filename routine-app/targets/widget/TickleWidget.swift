import SwiftUI
import WidgetKit

private let appGroup = "group.com.maywalan.tickle"

/// The few words the widget + Live Activity draw themselves, in the app's chosen language — the RN
/// side writes `language` ("en" / "th") into the App Group on every sync (src/lib/widget-sync.ts).
/// Falls back to the phone's language before the app has synced once.
enum TickleL10n {
  static var isThai: Bool {
    if let lang = UserDefaults(suiteName: appGroup)?.string(forKey: "language") { return lang == "th" }
    return Locale.preferredLanguages.first?.hasPrefix("th") ?? false
  }

  static var today: String { isThai ? "วันนี้" : "Today" }
  static var nothingToday: String { isThai ? "วันนี้ยังว่างอยู่" : "Nothing planned today" }
  static func more(_ n: Int) -> String { isThai ? "และอีก \(n) อย่าง" : "+\(n) more" }
  static var now: String { isThai ? "ตอนนี้" : "Now" }
  static var nowLower: String { isThai ? "ตอนนี้" : "now" }
  static func starts(_ time: String) -> String { isThai ? "เริ่ม \(time)" : "starts \(time)" }
  static func ends(_ time: String) -> String { isThai ? "จบ \(time)" : "ends \(time)" }
  static func reminder(_ time: String) -> String { isThai ? "เตือน · \(time)" : "reminder · \(time)" }
  static var plus10: String { isThai ? "+10 นาที" : "+10 min" }
  static var done: String { isThai ? "เสร็จ" : "Done" }
  static var widgetDescription: String { isThai ? "ดูแผนของวันนี้ได้ในแวบเดียว" : "See today's plans at a glance." }
}

struct TodayPlan: Codable, Identifiable {
  let id: String
  let name: String
  let time: String
  let color: String
}

struct TickleEntry: TimelineEntry {
  let date: Date
  let dateLabel: String
  let plans: [TodayPlan]
}

struct TickleTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> TickleEntry {
    TickleEntry(
      date: .now, dateLabel: TickleL10n.today,
      plans: [TodayPlan(id: "placeholder", name: TickleL10n.isThai ? "เดินตอนเช้า" : "Morning walk", time: TickleL10n.isThai ? "08:00" : "8:00 AM", color: "#1B76E8")])
  }

  func getSnapshot(in context: Context, completion: @escaping (TickleEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TickleEntry>) -> Void) {
    let entry = loadEntry()
    // The RN app pushes fresh data + calls reloadAllTimelines() on every plan change and app
    // foreground, so this policy is just a safety net in case the app goes unopened.
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }

  private func loadEntry() -> TickleEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    let dateLabel = defaults?.string(forKey: "dateLabel") ?? ""
    var plans: [TodayPlan] = []
    if let data = defaults?.data(forKey: "todayPlans"),
      let decoded = try? JSONDecoder().decode([TodayPlan].self, from: data)
    {
      plans = decoded
    }
    return TickleEntry(date: .now, dateLabel: dateLabel, plans: plans)
  }
}

extension Font {
  /// Anuphan (bundled in this extension, registered via UIAppFonts) — the app's only typeface, and
  /// the one that carries Thai. Weight maps to the matching static cut; there's no 800 cut, so
  /// anything heavier than semibold uses Bold, like the RN side's `Fonts` map.
  static func anuphan(size: CGFloat, weight: Font.Weight = .regular) -> Font {
    let name: String
    switch weight {
    case .bold, .heavy, .black: name = "Anuphan-Bold"
    case .semibold: name = "Anuphan-SemiBold"
    case .medium: name = "Anuphan-Medium"
    default: name = "Anuphan-Regular"
    }
    return .custom(name, size: size)
  }
}

extension Color {
  init(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    var rgb: UInt64 = 0
    Scanner(string: s).scanHexInt64(&rgb)
    self.init(
      red: Double((rgb >> 16) & 0xFF) / 255,
      green: Double((rgb >> 8) & 0xFF) / 255,
      blue: Double(rgb & 0xFF) / 255)
  }
}

private extension View {
  /// containerBackground is required on iOS 17+; falls back to a plain background below that,
  /// since this project's deployment target (15.1) predates it.
  @ViewBuilder
  func tickleBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(Color(hex: "#2A2A2E"), for: .widget)
    } else {
      background(Color(hex: "#2A2A2E"))
    }
  }
}

struct TickleWidgetView: View {
  var entry: TickleTimelineProvider.Entry
  @Environment(\.widgetFamily) var family

  private var limit: Int { family == .systemSmall ? 3 : 5 }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        RoundedRectangle(cornerRadius: 5)
          .fill(Color(hex: "#1B76E8"))
          .frame(width: 16, height: 16)
        Text("Tickle")
          .font(.anuphan(size: 11, weight: .bold))
          .foregroundStyle(.white.opacity(0.7))
          .lineLimit(1)
        Spacer(minLength: 4)
        Text(entry.dateLabel)
          .font(.anuphan(size: 9.5, weight: .semibold))
          .foregroundStyle(.white.opacity(0.45))
          .lineLimit(1)
      }

      if entry.plans.isEmpty {
        Text(TickleL10n.nothingToday)
          .font(.anuphan(size: 11))
          .foregroundStyle(.white.opacity(0.5))
      } else {
        ForEach(entry.plans.prefix(limit)) { plan in
          HStack(spacing: 6) {
            Circle()
              .fill(Color(hex: plan.color))
              .frame(width: 6, height: 6)
            Text(plan.name)
              .font(.anuphan(size: 11.5, weight: .semibold))
              .foregroundStyle(.white)
              .lineLimit(1)
            if family != .systemSmall {
              Spacer(minLength: 4)
              Text(plan.time)
                .font(.anuphan(size: 10, weight: .semibold))
                .foregroundStyle(.white.opacity(0.5))
            }
          }
        }
        let more = entry.plans.count - limit
        if more > 0 {
          Text(TickleL10n.more(more))
            .font(.anuphan(size: 10.5, weight: .semibold))
            .foregroundStyle(.white.opacity(0.45))
        }
      }
      Spacer(minLength: 0)
    }
    .padding(14)
    .tickleBackground()
  }
}

struct TickleWidget: Widget {
  let kind: String = "TickleWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TickleTimelineProvider()) { entry in
      TickleWidgetView(entry: entry)
    }
    .configurationDisplayName("Tickle")
    .description(TickleL10n.widgetDescription)
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct TickleWidgetBundle: WidgetBundle {
  var body: some Widget {
    TickleWidget()
    if #available(iOS 16.2, *) {
      TickleLiveActivity()
    }
  }
}
