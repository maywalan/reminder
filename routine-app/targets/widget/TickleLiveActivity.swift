import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// The Tickle Live Activity — mirrors Home's live card (design_handoff_tickle_home_7, "Live
// Activity"): title, plan + time meta, a countdown, a progress bar in the plan colour, and Done /
// +10 min (iOS 17+).
//
// The app can only update this while it's running, so every phase change that has to happen with
// the app closed rides on `staleDate` (set in TickleLiveActivityController): iOS re-renders the
// activity with `context.isStale == true` once it passes. Upcoming → stale means the task has
// started; live → stale means it has run past its end.

private let ink = Color(hex: "#10203A")
private let overtimeRed = Color(hex: "#C24A57")

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
  var onDark = false

  var body: some View {
    let state = context.state
    let color = onDark ? Color(hex: context.attributes.baseHex) : Color(hex: context.attributes.textHex)
    Group {
      switch mode(context) {
      case .upcoming:
        Text(timerInterval: min(state.updatedAt, state.start)...state.start, countsDown: true)
          .foregroundColor(color)
      case .live:
        if let end = state.end, state.start < end {
          Text(timerInterval: state.start...end, countsDown: true).foregroundColor(color)
        } else {
          Text("Now").foregroundColor(color)
        }
      case .overtime:
        // `.timer` counts up once its date has passed — that's the overtime clock.
        (Text("+") + Text(state.end ?? state.start, style: .timer)).foregroundColor(overtimeRed)
      case .due:
        Text("Now").foregroundColor(color)
      }
    }
    .font(.system(size: size, weight: .semibold).monospacedDigit())
    .multilineTextAlignment(.trailing)
  }
}

@available(iOS 16.2, *)
private struct ProgressBar: View {
  let context: ActivityViewContext<TickleActivityAttributes>

  var body: some View {
    let a = context.attributes
    let state = context.state
    switch mode(context) {
    case .live:
      if let end = state.end, state.start < end {
        ProgressView(timerInterval: state.start...end, countsDown: false, label: { EmptyView() }, currentValueLabel: { EmptyView() })
          .progressViewStyle(.linear)
          .tint(Color(hex: a.baseHex))
      } else {
        bar(fill: 1)
      }
    case .upcoming:
      bar(fill: 0)
    case .overtime, .due:
      bar(fill: 1)
    }
  }

  private func bar(fill: CGFloat) -> some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule().fill(Color(hex: context.attributes.trackHex))
        Capsule().fill(Color(hex: context.attributes.baseHex)).frame(width: geo.size.width * fill)
      }
    }
    .frame(height: 4)
  }
}

@available(iOS 16.2, *)
private struct Meta: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  var onDark = false

  var body: some View {
    let a = context.attributes
    let state = context.state
    let detail: String = {
      switch mode(context) {
      case .upcoming: return "starts \(hhmm(state.start))"
      case .live, .overtime: return state.end.map { "ends \(hhmm($0))" } ?? "now"
      case .due: return "reminder · \(hhmm(state.start))"
      }
    }()
    let muted = onDark ? Color.white.opacity(0.6) : ink.opacity(0.5)
    return (
      (a.groupName.map { Text($0).fontWeight(.semibold).foregroundColor(onDark ? Color(hex: a.baseHex) : Color(hex: a.textHex)) + Text(" · ") }
        ?? Text(""))
        + Text(detail)
    )
    .font(.system(size: 12))
    .foregroundColor(muted)
    .lineLimit(1)
  }
}

@available(iOS 16.2, *)
private struct Actions: View {
  let context: ActivityViewContext<TickleActivityAttributes>
  var onDark = false

  var body: some View {
    if #available(iOS 17.0, *) {
      let a = context.attributes
      HStack(spacing: 14) {
        Spacer(minLength: 0)
        if context.state.end != nil {
          Button(intent: ExtendTickleTaskIntent(planId: a.planId)) {
            Text("+10 min")
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(onDark ? .white.opacity(0.7) : ink.opacity(0.5))
          }
          .buttonStyle(.plain)
        }
        Button(intent: CompleteTickleTaskIntent(planId: a.planId)) {
          Text("Done")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(onDark ? .white : Color(hex: a.pillTextHex))
            .padding(.horizontal, 14)
            .frame(height: 28)
            .background(Capsule().fill(onDark ? Color.white.opacity(0.14) : .white))
            .overlay(Capsule().stroke(onDark ? Color.white.opacity(0.25) : Color(hex: a.pillBorderHex), lineWidth: 1))
        }
        .buttonStyle(.plain)
      }
    }
  }
}

@available(iOS 16.2, *)
struct TickleLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TickleActivityAttributes.self) { context in
      // Lock Screen / banner
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.title)
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(ink)
              .lineLimit(1)
            Meta(context: context)
          }
          Spacer(minLength: 8)
          Countdown(context: context, size: 24)
        }
        ProgressBar(context: context)
        Actions(context: context)
      }
      .padding(16)
      .activityBackgroundTint(Color(hex: context.attributes.tintHex))
      .activitySystemActionForegroundColor(ink)
      .widgetURL(URL(string: "tickle://"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            Circle().fill(Color(hex: context.attributes.baseHex)).frame(width: 9, height: 9)
            Text(context.attributes.title)
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(1)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Countdown(context: context, size: 20, onDark: true).padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            Meta(context: context, onDark: true)
            ProgressBar(context: context)
            Actions(context: context, onDark: true)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Circle().fill(Color(hex: context.attributes.baseHex)).frame(width: 10, height: 10)
      } compactTrailing: {
        Countdown(context: context, size: 13, onDark: true).frame(maxWidth: 56)
      } minimal: {
        Circle().fill(Color(hex: context.attributes.baseHex)).frame(width: 10, height: 10)
      }
      .widgetURL(URL(string: "tickle://"))
      .keylineTint(Color(hex: context.attributes.baseHex))
    }
  }
}
