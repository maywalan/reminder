import ActivityKit
import Foundation

/// Lock Screen button taps (targets/widget/_shared/TickleLiveActivityIntents.swift) queued in the
/// App Group for the JS app to apply to its store the next time it runs — the intent itself only
/// updates the Live Activity, it can't reach the Zustand store.
public enum TickleLiveActivityActions {
  static let appGroup = "group.com.maywalan.tickle"
  static let key = "liveActivityActions"

  public static func enqueue(action: String, planId: String) {
    let defaults = UserDefaults(suiteName: appGroup)
    var queue = defaults?.array(forKey: key) as? [[String: String]] ?? []
    queue.append(["action": action, "planId": planId, "at": String(Date().timeIntervalSince1970 * 1000)])
    defaults?.set(queue, forKey: key)
  }

  public static func take() -> [[String: String]] {
    let defaults = UserDefaults(suiteName: appGroup)
    let queue = defaults?.array(forKey: key) as? [[String: String]] ?? []
    defaults?.removeObject(forKey: key)
    return queue
  }
}

public struct TickleLiveActivityPayload {
  var planId: String
  var title: String
  var groupName: String?
  var baseHex: String
  var textHex: String
  var tintHex: String
  var trackHex: String
  var pillBorderHex: String
  var pillTextHex: String
  var phase: String
  var start: Date
  var end: Date?
}

/// Keeps at most one Tickle Live Activity running, matching whatever the JS side last asked for.
@available(iOS 16.2, *)
public final class TickleLiveActivityController {
  public static let shared = TickleLiveActivityController()

  private typealias TickleActivity = Activity<TickleActivityAttributes>

  /// The activity re-renders with `context.isStale` once this passes — that's how the widget
  /// flips from "starts in" to "ends in" (and from "ends in" to overtime) with the app closed.
  private static func staleDate(_ state: TickleActivityAttributes.ContentState) -> Date? {
    state.phase == "upcoming" ? state.start : state.end
  }

  public var areEnabled: Bool { ActivityAuthorizationInfo().areActivitiesEnabled }

  func sync(_ payload: TickleLiveActivityPayload?) async {
    let running = TickleActivity.activities
    guard let p = payload else {
      for a in running { await a.end(nil, dismissalPolicy: .immediate) }
      return
    }

    let attributes = TickleActivityAttributes(
      planId: p.planId, title: p.title, groupName: p.groupName, baseHex: p.baseHex, textHex: p.textHex,
      tintHex: p.tintHex, trackHex: p.trackHex, pillBorderHex: p.pillBorderHex, pillTextHex: p.pillTextHex)
    let state = TickleActivityAttributes.ContentState(phase: p.phase, start: p.start, end: p.end, updatedAt: Date())

    var current: TickleActivity?
    for a in running {
      // Attributes are immutable, so an edited title/colour means starting a fresh activity.
      if current == nil && a.attributes == attributes {
        current = a
      } else {
        await a.end(nil, dismissalPolicy: .immediate)
      }
    }

    if let current {
      let old = current.content.state
      if old.phase != state.phase || old.start != state.start || old.end != state.end {
        await current.update(ActivityContent(state: state, staleDate: Self.staleDate(state)))
      }
      return
    }

    guard areEnabled else { return }
    _ = try? TickleActivity.request(
      attributes: attributes,
      content: ActivityContent(state: state, staleDate: Self.staleDate(state)),
      pushType: nil)
  }

  /// Lock Screen "Done".
  public func complete(planId: String) async {
    for a in TickleActivity.activities where a.attributes.planId == planId {
      await a.end(nil, dismissalPolicy: .immediate)
    }
  }

  /// Lock Screen "+10 min".
  public func extend(planId: String, minutes: Double) async {
    for a in TickleActivity.activities where a.attributes.planId == planId {
      var state = a.content.state
      guard let end = state.end else { continue }
      state.end = end.addingTimeInterval(minutes * 60)
      state.updatedAt = Date()
      await a.update(ActivityContent(state: state, staleDate: Self.staleDate(state)))
    }
  }
}
