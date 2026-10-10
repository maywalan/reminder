import SwiftUI
import WidgetKit

// Calendar widgets — design handoff `tickle_calendar_widget/` Round 4: 4a large month, 4c medium
// two weeks + small "Today" + small "Next 3 days", 4b lock-screen accessories.

private enum CalStyle {
  static let todayText = Color(hex: "#10203A")
  static let holiday = Color(hex: "#FFC24D")
  static let todayKicker = Color(hex: "#7FB3FF")
  static let chipAlpha = 0.33
}

// MARK: - Container

private struct CalBackground: View {
  var body: some View {
    // The handoff's frosted rgba(18,22,40,.62) over the wallpaper — widgets can't blur what's behind
    // them, so this is the colour that glass reads as over Tickle's blue→lilac wallpapers.
    ZStack {
      LinearGradient(colors: [Color(hex: "#1D2444"), Color(hex: "#2C3158")], startPoint: .top, endPoint: .bottom)
      ContainerRelativeShape().strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
    }
  }
}

private extension View {
  @ViewBuilder
  func calBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { CalBackground() }
    } else {
      background(CalBackground())
    }
  }

  @ViewBuilder
  func accessoryBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { AccessoryWidgetBackground() }
    } else {
      self
    }
  }

  @ViewBuilder
  func clearAccessoryBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { Color.clear }
    } else {
      self
    }
  }
}

extension WidgetConfiguration {
  /// The handoff's paddings are measured from the widget edge, so drop the system's iOS 17 margins.
  func tickleNoMargins() -> some WidgetConfiguration {
    if #available(iOSApplicationExtension 17.0, *) {
      return contentMarginsDisabled()
    } else {
      return self
    }
  }
}

// MARK: - Chip + grid (large / medium)

private struct PlanChip: View {
  let plan: CalPlan

  var body: some View {
    let color = Color(hex: plan.color)
    HStack(spacing: 0) {
      color.frame(width: 2)
      Text(plan.title)
        .font(.anuphan(size: 7, weight: .semibold))
        .strikethrough(plan.done)
        .foregroundStyle(.white)
        .lineLimit(1)
        .truncationMode(.tail)
        .padding(.horizontal, 2.5)
      Spacer(minLength: 0)
    }
    .frame(height: 11)
    .background(color.opacity(CalStyle.chipAlpha))
    .clipShape(RoundedRectangle(cornerRadius: 3, style: .continuous))
    .opacity(plan.done ? 0.5 : 1)
  }
}

private struct DayCell: View {
  let day: Date
  let entry: CalEntry
  /// False for leading/trailing days of the large widget's month grid.
  let inMonth: Bool

  var body: some View {
    let iso = CalDay.iso(day)
    let isToday = iso == entry.todayISO
    let plans = inMonth ? entry.data.plans(on: iso) : []
    let shown = plans.count >= 3 ? Array(plans.prefix(1)) : plans

    ZStack(alignment: .top) {
      // The whole cell opens that day; the chips' own links sit above it and win taps on themselves.
      if inMonth {
        Link(destination: CalLink.day(iso)) { Color.white.opacity(0.001) }
      }
      VStack(spacing: 1.5) {
        Text("\(CalDay.day(day))")
          .font(.anuphan(size: 9, weight: .bold))
          .foregroundStyle(dateColor(isToday: isToday, holiday: entry.data.holidays[iso] != nil))
          .frame(width: 15, height: 15)
          .background(Circle().fill(isToday ? Color.white : Color.clear))
        ForEach(shown) { plan in
          Link(destination: CalLink.plan(plan)) { PlanChip(plan: plan) }
        }
        if plans.count >= 3 {
          Text(CalText.more(plans.count - 1))
            .font(.anuphan(size: 7, weight: .semibold))
            .foregroundStyle(.white.opacity(0.65))
            .lineLimit(1)
            .frame(height: 11)
        }
        Spacer(minLength: 0)
      }
      .padding(.horizontal, 1.5)
      .padding(.vertical, 2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private func dateColor(isToday: Bool, holiday: Bool) -> Color {
    if isToday { return CalStyle.todayText }
    if !inMonth { return .white.opacity(0.28) }
    if holiday { return CalStyle.holiday }
    return .white.opacity(0.92)
  }
}

private struct CalGrid: View {
  let days: [Date]
  let entry: CalEntry
  /// Month the large widget is showing; nil for the medium widget (every day counts).
  let month: Int?

  var body: some View {
    let rows = days.count / 7
    VStack(spacing: 0) {
      HStack(spacing: 0) {
        ForEach(0..<7, id: \.self) { i in
          Text(CalText.weekdayLetters[i])
            .font(.anuphan(size: 9, weight: .bold))
            .foregroundStyle(.white.opacity(0.5))
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.bottom, 3)
      Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
      ForEach(0..<rows, id: \.self) { r in
        HStack(spacing: 0) {
          ForEach(0..<7, id: \.self) { c in
            let day = days[r * 7 + c]
            DayCell(day: day, entry: entry, inMonth: month.map { CalDay.month(day) == $0 } ?? true)
          }
        }
        .frame(maxHeight: .infinity)
        Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1)
      }
    }
  }
}

private struct CalHeader: View {
  let title: String
  let size: CGFloat
  let entry: CalEntry

  var body: some View {
    HStack(alignment: .center) {
      Text(title)
        .font(.anuphan(size: size, weight: .bold))
        .foregroundStyle(.white)
        .lineLimit(1)
      Spacer(minLength: 6)
      Text(CalText.plansToday(entry.data.plans(on: entry.todayISO).count))
        .font(.anuphan(size: 10.5, weight: .semibold))
        .foregroundStyle(.white)
        .lineLimit(1)
        .padding(.vertical, 2)
        .padding(.horizontal, 8)
        .background(Capsule().fill(Color.white.opacity(0.14)))
    }
  }
}

struct CalendarGridWidgetView: View {
  let entry: CalEntry
  /// Set only by the preview harness — `widgetFamily` can't be injected outside WidgetKit.
  var familyOverride: WidgetFamily? = nil
  @Environment(\.widgetFamily) private var envFamily
  private var family: WidgetFamily { familyOverride ?? envFamily }

  var body: some View {
    Group {
      if family == .systemLarge {
        VStack(spacing: 6) {
          CalHeader(title: CalText.monthTitle(entry.date), size: 14, entry: entry)
            .padding(.horizontal, 4)
          CalGrid(days: CalDay.monthGrid(entry.date), entry: entry, month: CalDay.month(entry.date))
        }
        .padding(EdgeInsets(top: 12, leading: 9, bottom: 9, trailing: 9))
      } else {
        let start = CalDay.weekStart(entry.date)
        let days = (0..<14).map { CalDay.add($0, to: start) }
        VStack(spacing: 4) {
          CalHeader(title: CalText.rangeTitle(days[0], days[13]), size: 13, entry: entry)
            .padding(.horizontal, 4)
          CalGrid(days: days, entry: entry, month: nil)
        }
        .padding(EdgeInsets(top: 10, leading: 9, bottom: 7, trailing: 9))
      }
    }
    .calBackground()
  }
}

// MARK: - Small "Today"

private struct TodayRow: View {
  let plan: CalPlan

  var body: some View {
    let color = Color(hex: plan.color)
    HStack(spacing: 0) {
      color.frame(width: 3)
      HStack(spacing: 4) {
        Text(plan.title)
          .font(.anuphan(size: 10.5, weight: .semibold))
          .strikethrough(plan.done)
          .foregroundStyle(.white)
          .lineLimit(1)
        Spacer(minLength: 2)
        Text(plan.shortTime)
          .font(.anuphan(size: 9, weight: .medium))
          .foregroundStyle(.white.opacity(0.7))
          .lineLimit(1)
          .fixedSize()
      }
      .padding(.horizontal, 6)
    }
    .frame(height: 24)
    .background(color.opacity(CalStyle.chipAlpha))
    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    .opacity(plan.done ? 0.5 : 1)
  }
}

struct TodaySmallWidgetView: View {
  let entry: CalEntry

  var body: some View {
    let plans = entry.data.plans(on: entry.todayISO)
    let shown = plans.count > 3 ? Array(plans.prefix(2)) : plans

    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .firstTextBaseline, spacing: 5) {
        Text(CalText.weekdayShort(entry.date).uppercased())
          .font(.anuphan(size: 10, weight: .bold))
          .foregroundStyle(CalStyle.todayKicker)
        Text("\(CalDay.day(entry.date))")
          .font(.anuphan(size: 22, weight: .bold))
          .foregroundStyle(.white)
      }
      Spacer(minLength: 0)
      if plans.isEmpty {
        Text(CalText.nothingPlanned)
          .font(.anuphan(size: 12, weight: .semibold))
          .foregroundStyle(.white.opacity(0.7))
        Text(CalText.addPlan)
          .font(.anuphan(size: 10.5, weight: .semibold))
          .foregroundStyle(CalStyle.todayKicker)
          .padding(.bottom, 2)
      } else {
        ForEach(shown) { TodayRow(plan: $0) }
        if plans.count > 3 {
          Text(CalText.more(plans.count - 2))
            .font(.anuphan(size: 10.5, weight: .semibold))
            .foregroundStyle(.white.opacity(0.65))
            .frame(maxWidth: .infinity, minHeight: 24, alignment: .leading)
            .padding(.horizontal, 9)
            .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(Color.white.opacity(0.1)))
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(EdgeInsets(top: 11, leading: 10, bottom: 10, trailing: 10))
    .widgetURL(plans.isEmpty ? CalLink.add(entry.todayISO) : CalLink.day(entry.todayISO))
    .calBackground()
  }
}

// MARK: - Small "Next 3 days"

private struct Next3Chip: View {
  let plan: CalPlan

  var body: some View {
    let color = Color(hex: plan.color)
    HStack(spacing: 0) {
      color.frame(width: 2.5)
      Text(plan.title)
        .font(.anuphan(size: 8.5, weight: .semibold))
        .strikethrough(plan.done)
        .foregroundStyle(.white)
        .lineLimit(2)
        .lineSpacing(-1)
        .padding(.horizontal, 3.5)
      Spacer(minLength: 0)
    }
    .frame(height: 30)
    .background(color.opacity(CalStyle.chipAlpha))
    .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    .opacity(plan.done ? 0.5 : 1)
  }
}

struct Next3SmallWidgetView: View {
  let entry: CalEntry

  var body: some View {
    HStack(alignment: .top, spacing: 4) {
      ForEach(0..<3, id: \.self) { i in
        let day = CalDay.add(i, to: CalDay.startOfDay(entry.date))
        let plans = entry.data.plans(on: CalDay.iso(day))
        VStack(spacing: 3) {
          VStack(spacing: 0) {
            Text(i == 0 ? CalText.today : CalText.weekdayShort(day))
              .font(.anuphan(size: 8.5, weight: .bold))
              .foregroundStyle(.white.opacity(i == 0 ? 1 : 0.6))
              .lineLimit(1)
            Text("\(CalDay.day(day))")
              .font(.anuphan(size: 17, weight: .bold))
              .foregroundStyle(.white.opacity(i == 0 ? 1 : 0.6))
          }
          .padding(.bottom, 2)
          ForEach(plans.prefix(2)) { Next3Chip(plan: $0) }
          if plans.count > 2 {
            Text("+\(plans.count - 2)")
              .font(.anuphan(size: 8.5, weight: .semibold))
              .foregroundStyle(.white.opacity(0.65))
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(.leading, 3)
          }
          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity)
      }
    }
    .padding(EdgeInsets(top: 11, leading: 10, bottom: 10, trailing: 10))
    .widgetURL(CalLink.day(entry.todayISO))
    .calBackground()
  }
}

// MARK: - Lock screen (4b)

/// What the lock-screen "Next" spots show: the next timed plan still to start today, else
/// tomorrow's first; nil when neither exists.
private struct NextUp {
  let plan: CalPlan
  let then: CalPlan?
  let isToday: Bool

  init?(_ entry: CalEntry) {
    let tomorrowISO = CalDay.iso(CalDay.add(1, to: entry.date))
    let upcoming = entry.data.upcoming(after: entry.date).filter { $0.date == entry.todayISO || $0.date == tomorrowISO }
    guard let first = upcoming.first else { return nil }
    plan = first
    isToday = first.date == entry.todayISO
    then = upcoming.dropFirst().first { $0.date == first.date }
  }
}

@available(iOS 16.0, *)
struct LockWidgetView: View {
  let entry: CalEntry
  var familyOverride: WidgetFamily? = nil
  @Environment(\.widgetFamily) private var envFamily
  private var family: WidgetFamily { familyOverride ?? envFamily }

  var body: some View {
    switch family {
    case .accessoryInline: inline
    case .accessoryRectangular: rectangular
    default: countRing
    }
  }

  private var dayLabel: String { "\(CalText.weekdayShort(entry.date)) \(CalDay.day(entry.date))" }
  private var todays: [CalPlan] { entry.data.plans(on: entry.todayISO) }

  private var inline: some View {
    let next = NextUp(entry).flatMap { $0.isToday ? $0.plan : nil }
    return Group {
      if let next {
        Text("\(dayLabel) · \(Image(systemName: "calendar")) \(next.shortTime) \(next.title)")
      } else {
        Text("\(dayLabel) · \(todays.isEmpty ? CalText.plansToday(0) : CalText.restFreeShort)")
      }
    }
    .font(.anuphan(size: 14, weight: .semibold))
    .widgetURL(next.map(CalLink.plan) ?? CalLink.day(entry.todayISO))
    .clearAccessoryBackground()
  }

  private var rectangular: some View {
    let next = NextUp(entry)
    return VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 4) {
        Circle().frame(width: 7, height: 7)
        Text(next.map { "\($0.isToday ? CalText.next : CalText.tomorrow) · \($0.plan.timeLabel)" } ?? CalText.today)
          .lineLimit(1)
      }
      .font(.anuphan(size: 11, weight: .bold))
      .opacity(0.75)
      Text(next?.plan.title ?? (todays.isEmpty ? CalText.plansToday(0) : CalText.restFree))
        .font(.anuphan(size: 14, weight: .bold))
        .lineLimit(next == nil ? 2 : 1)
      if let then = next?.then {
        Text(CalText.then(then.title, then.shortTime))
          .font(.anuphan(size: 11, weight: .medium))
          .opacity(0.75)
          .lineLimit(1)
      }
    }
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(.horizontal, 10)
    .widgetURL(next.map { CalLink.plan($0.plan) } ?? CalLink.day(entry.todayISO))
    .accessoryBackground()
  }

  private var countRing: some View {
    let total = todays.count
    let done = todays.filter(\.done).count
    return ZStack {
      Circle().stroke(Color.white.opacity(0.25), lineWidth: 5)
      Circle()
        .trim(from: 0, to: total == 0 ? 0 : CGFloat(done) / CGFloat(total))
        .stroke(Color.white, style: StrokeStyle(lineWidth: 5, lineCap: .round))
        .rotationEffect(.degrees(-90))
      VStack(spacing: -2) {
        Text("\(total - done)")
          .font(.anuphan(size: 20, weight: .bold))
        Text(CalText.toDo)
          .font(.anuphan(size: 9, weight: .semibold))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
    }
    .padding(4)
    .foregroundStyle(.white)
    .widgetURL(CalLink.day(entry.todayISO))
    .accessoryBackground()
  }
}

@available(iOS 16.0, *)
struct DateCircleWidgetView: View {
  let entry: CalEntry

  var body: some View {
    VStack(spacing: -3) {
      Text(CalText.monthShort(entry.date).uppercased())
        .font(.anuphan(size: 10, weight: .bold))
        .tracking(0.5)
      Text("\(CalDay.day(entry.date))")
        .font(.anuphan(size: 24, weight: .bold))
    }
    .foregroundStyle(.white)
    .widgetURL(CalLink.day(entry.todayISO))
    .accessoryBackground()
  }
}

// MARK: - Widgets

/// Kind kept as "TickleWidget" so a Today widget placed before the calendar redesign carries over.
struct TickleWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TickleWidget", provider: CalProvider()) { TodaySmallWidgetView(entry: $0) }
      .configurationDisplayName(CalText.todayName)
      .description(CalText.todayDescription)
      .supportedFamilies([.systemSmall])
      .tickleNoMargins()
  }
}

struct TickleCalendarWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TickleCalendarWidget", provider: CalProvider()) { CalendarGridWidgetView(entry: $0) }
      .configurationDisplayName(CalText.calendarName)
      .description(CalText.calendarDescription)
      .supportedFamilies([.systemMedium, .systemLarge])
      .tickleNoMargins()
  }
}

struct TickleNext3Widget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TickleNext3Widget", provider: CalProvider()) { Next3SmallWidgetView(entry: $0) }
      .configurationDisplayName(CalText.next3Name)
      .description(CalText.next3Description)
      .supportedFamilies([.systemSmall])
      .tickleNoMargins()
  }
}

@available(iOS 16.0, *)
struct TickleLockWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TickleLockWidget", provider: CalProvider()) { LockWidgetView(entry: $0) }
      .configurationDisplayName(CalText.lockName)
      .description(CalText.lockDescription)
      .supportedFamilies([.accessoryInline, .accessoryRectangular, .accessoryCircular])
  }
}

@available(iOS 16.0, *)
struct TickleDateWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TickleDateWidget", provider: CalProvider()) { DateCircleWidgetView(entry: $0) }
      .configurationDisplayName(CalText.dateName)
      .description(CalText.dateDescription)
      .supportedFamilies([.accessoryCircular])
  }
}
