import SwiftUI
import WidgetKit

private let appGroup = "group.com.maywalan.tickle"

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
      date: .now, dateLabel: "Today",
      plans: [TodayPlan(id: "placeholder", name: "Morning walk", time: "8:00 AM", color: "#1B76E8")])
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

private extension Color {
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
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(.white.opacity(0.7))
          .lineLimit(1)
        Spacer(minLength: 4)
        Text(entry.dateLabel)
          .font(.system(size: 9.5, weight: .semibold))
          .foregroundStyle(.white.opacity(0.45))
          .lineLimit(1)
      }

      if entry.plans.isEmpty {
        Text("Nothing planned today")
          .font(.system(size: 11))
          .foregroundStyle(.white.opacity(0.5))
      } else {
        ForEach(entry.plans.prefix(limit)) { plan in
          HStack(spacing: 6) {
            Circle()
              .fill(Color(hex: plan.color))
              .frame(width: 6, height: 6)
            Text(plan.name)
              .font(.system(size: 11.5, weight: .semibold))
              .foregroundStyle(.white)
              .lineLimit(1)
            if family != .systemSmall {
              Spacer(minLength: 4)
              Text(plan.time)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white.opacity(0.5))
            }
          }
        }
        let more = entry.plans.count - limit
        if more > 0 {
          Text("+\(more) more")
            .font(.system(size: 10.5, weight: .semibold))
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
    .description("See today's plans at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct TickleWidgetBundle: WidgetBundle {
  var body: some Widget {
    TickleWidget()
  }
}
