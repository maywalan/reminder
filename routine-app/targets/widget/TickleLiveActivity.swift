import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// The Tickle Live Activity — mirrors Home's live card (design_handoff_tickle_home_7, "Live
// Activity"): title, plan + time meta, a countdown, a progress bar in the plan colour, and Done
// (iOS 17+).
//
// The app can only update this while it's running, so every phase change that has to happen with
// the app closed rides on `staleDate` (set in TickleLiveActivityController): iOS re-renders the
// activity with `context.isStale == true` once it passes. Upcoming → stale means the task has
// started; live → stale means it has run past its end.

private let overtimeRed = Color(hex: "#C24A57")

/// Light/dark colours (2026-11-14 redesign, user's mock-up). The Lock Screen follows the phone's
/// appearance; the Dynamic Island is always black, so it always uses the dark set.
private struct LAPalette {
  let text: Color
  let muted: Color
  let countdown: Color
  let bar: Color
  let track: Color
  let background: Color
  let pillBg: Color
  let pillBorder: Color

  static func of(_ scheme: ColorScheme) -> LAPalette {
    scheme == .dark
      ? LAPalette(
        text: .white, muted: Color.white.opacity(0.6), countdown: Color(hex: "#6FD08C"), bar: Color(hex: "#6FD08C"),
        track: Color.white.opacity(0.16), background: Color(hex: "#1C1D22"), pillBg: Color.white.opacity(0.12),
        pillBorder: Color.white.opacity(0.22))
      : LAPalette(
        text: Color(hex: "#10203A"), muted: Color(hex: "#10203A").opacity(0.55), countdown: Color(hex: "#2F7A4E"),
        bar: Color(hex: "#3F9A63"), track: Color(hex: "#10203A").opacity(0.1), background: Color(hex: "#F4F2F8"),
        pillBg: .white, pillBorder: Color(hex: "#10203A").opacity(0.14))
  }
}

private enum Mode {
  case upcoming, live, overtime, due
}

@available(iOS 16.2, *)
private func mode(_ context: ActivityViewContext<TickleActivityAttributes>) -> Mode {
  let state = context.state
  if state.phase == "upcoming" {
    if !context.isStale { return .upcoming }
    return state.end == nil ? .due : .live
  }
  return context.isStale ? .overtime : .live
}

private func hhmm(_ date: Date) -> String {
  let f = DateFormatter()
  f.dateFormat = "HH:mm"
  return f.string(from: date)
}

@available(iOS 16.2, *)
private struct Countdown: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let size: CGFloat
  let palette: LAPalette

  var body: some View {
    let state = context.state
    let color = palette.countdown
    Group {
      switch mode(context) {
      case .upcoming:
        Text(timerInterval: min(state.updatedAt, state.start)...state.start, countsDown: true)
          .foregroundColor(color)
      case .live:
        if let end = state.end, state.start < end {
          Text(timerInterval: state.start...end, countsDown: true).foregroundColor(color)
        } else {
          Text(TickleL10n.now).foregroundColor(color)
        }
      case .overtime:
        // `.timer` counts up once its date has passed — that's the overtime clock.
        (Text("+") + Text(state.end ?? state.start, style: .timer)).foregroundColor(overtimeRed)
      case .due:
        Text(TickleL10n.now).foregroundColor(color)
      }
    }
    .font(.anuphan(size: size, weight: .bold).monospacedDigit())
    .multilineTextAlignment(.trailing)
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }
}

@available(iOS 16.2, *)
private struct ProgressBar: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let palette: LAPalette

  var body: some View {
    let state = context.state
    switch mode(context) {
    case .live:
      if let end = state.end, state.start < end {
        ProgressView(timerInterval: state.start...end, countsDown: false, label: { EmptyView() }, currentValueLabel: { EmptyView() })
          .progressViewStyle(.linear)
          .tint(palette.bar)
      } else {
        bar(fill: 1)
      }
    case .upcoming:
      // A short stub so the bar reads as "not started yet" rather than empty.
      bar(fill: 0.05)
    case .overtime, .due:
      bar(fill: 1)
    }
  }

  private func bar(fill: CGFloat) -> some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule().fill(palette.track)
        Capsule().fill(palette.bar).frame(width: max(8, geo.size.width * fill))
      }
    }
    .frame(height: 6)
  }
}

@available(iOS 16.2, *)
private struct Meta: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let palette: LAPalette
  var size: CGFloat = 14

  var body: some View {
    let a = context.attributes
    let state = context.state
    let detail: String = {
      switch mode(context) {
      case .upcoming: return TickleL10n.starts(hhmm(state.start))
      case .live, .overtime: return state.end.map { TickleL10n.ends(hhmm($0)) } ?? TickleL10n.nowLower
      case .due: return TickleL10n.reminder(hhmm(state.start))
      }
    }()
    let line = a.groupName.map { "\($0) · \(detail)" } ?? detail
    return Text(line.prefix(1).uppercased() + line.dropFirst())
      .font(.anuphan(size: size, weight: .medium))
      .foregroundColor(palette.muted)
      .lineLimit(1)
  }
}

/// The plan's icon in white on a solid plan-colour tile (rounded square on the Lock Screen, circle
/// in the Dynamic Island), as in the 2026-11-14 mock-up.
@available(iOS 16.2, *)
private struct PlanIconTile: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let size: CGFloat
  var circle = false

  var body: some View {
    let a = context.attributes
    ZStack {
      if circle {
        Circle().fill(Color(hex: a.baseHex))
      } else {
        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous).fill(Color(hex: a.baseHex))
      }
      if let id = a.iconId, UIImage(named: "planicon-\(id)") != nil {
        Image("planicon-\(id)")
          .renderingMode(.template)
          .resizable()
          .scaledToFit()
          .foregroundColor(.white)
          .frame(width: size * 0.52, height: size * 0.52)
      } else {
        Circle().fill(Color.white).frame(width: size * 0.28, height: size * 0.28)
      }
    }
    .frame(width: size, height: size)
  }
}

@available(iOS 16.2, *)
private struct Actions: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let palette: LAPalette

  var body: some View {
    if #available(iOS 17.0, *) {
      let a = context.attributes
      HStack(spacing: 14) {
        Spacer(minLength: 0)
        // "+10 min" was here; removed 2026-11-09 (user's call, same as Home on 10-22).
        // ExtendTickleTaskIntent and the app's 'extend' handling stay so taps from older builds still work.
        Button(intent: CompleteTickleTaskIntent(planId: a.planId)) {
          Text(TickleL10n.done)
            .font(.anuphan(size: 13, weight: .semibold))
            .foregroundColor(palette.text)
            .padding(.horizontal, 14)
            .frame(height: 28)
            .background(Capsule().fill(palette.pillBg))
            .overlay(Capsule().stroke(palette.pillBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
      }
    }
  }
}

/// The plan row shared by the Lock Screen and the expanded Dynamic Island: icon, bold name with
/// the time line under it, and a large countdown on the right.
@available(iOS 16.2, *)
private struct PlanRow: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  let palette: LAPalette
  let iconSize: CGFloat
  let circleIcon: Bool

  var body: some View {
    HStack(alignment: .center, spacing: 14) {
      PlanIconTile(context: context, size: iconSize, circle: circleIcon)
      VStack(alignment: .leading, spacing: 1) {
        Text(context.attributes.title)
          .font(.anuphan(size: 20, weight: .bold))
          .foregroundColor(palette.text)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Meta(context: context, palette: palette)
      }
      .layoutPriority(1)
      Spacer(minLength: 6)
      Countdown(context: context, size: 36, palette: palette)
        .frame(maxWidth: 120, alignment: .trailing)
    }
  }
}

/// Lock Screen / banner. Reads the phone's appearance so it switches with light and dark mode.
@available(iOS 16.2, *)
private struct LockScreenView: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    let palette = LAPalette.of(scheme)
    VStack(alignment: .leading, spacing: 14) {
      PlanRow(context: context, palette: palette, iconSize: 48, circleIcon: false)
      ProgressBar(context: context, palette: palette)
      Actions(context: context, palette: palette)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 16)
    .activityBackgroundTint(palette.background)
    .activitySystemActionForegroundColor(palette.text)
  }
}

@available(iOS 16.2, *)
struct TickleLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TickleActivityAttributes.self) { context in
      LockScreenView(context: context)
        .widgetURL(URL(string: "tickle://"))
    } dynamicIsland: { context in
      let palette = LAPalette.of(.dark)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          // One full-width row under the camera, like the mock-up, instead of splitting the
          // name and countdown into the narrow leading/trailing regions.
          VStack(alignment: .leading, spacing: 12) {
            PlanRow(context: context, palette: palette, iconSize: 48, circleIcon: true)
            ProgressBar(context: context, palette: palette)
            Actions(context: context, palette: palette)
          }
          .padding(.horizontal, 6)
          .padding(.bottom, 4)
        }
      } compactLeading: {
        // Compact island: plan icon + countdown (2026-11-14 mock-up; it was empty from 2026-10-10).
        PlanIconTile(context: context, size: 24, circle: true)
      } compactTrailing: {
        Countdown(context: context, size: 15, palette: palette)
          .frame(maxWidth: 52, alignment: .trailing)
      } minimal: {
        PlanIconTile(context: context, size: 24, circle: true)
      }
      .widgetURL(URL(string: "tickle://"))
      .keylineTint(Color(hex: context.attributes.baseHex))
    }
  }
}
