import AppIntents
import Foundation

#if canImport(TickleLiveActivity)
  import TickleLiveActivity
#endif

// Done / +10 min on the Tickle Live Activity (Lock Screen + Dynamic Island), iOS 17+.
//
// This file is in `_shared`, so @bacons/apple-targets compiles it into both the widget extension
// (which needs the types for `Button(intent:)`) and the main app. A LiveActivityIntent's
// `perform()` runs in the *app's* process, where the TickleLiveActivity pod is linked — so the
// `canImport` branch is what actually runs; the widget-side compile never calls `perform()`.

@available(iOS 17.0, *)
struct CompleteTickleTaskIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Mark Task Done"
  static var isDiscoverable = false

  @Parameter(title: "Task ID") var planId: String

  init() {}
  init(planId: String) { self.planId = planId }

  func perform() async throws -> some IntentResult {
    #if canImport(TickleLiveActivity)
      TickleLiveActivityActions.enqueue(action: "complete", planId: planId)
      await TickleLiveActivityController.shared.complete(planId: planId)
    #endif
    return .result()
  }
}

@available(iOS 17.0, *)
struct ExtendTickleTaskIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Add 10 Minutes"
  static var isDiscoverable = false

  @Parameter(title: "Task ID") var planId: String

  init() {}
  init(planId: String) { self.planId = planId }

  func perform() async throws -> some IntentResult {
    #if canImport(TickleLiveActivity)
      TickleLiveActivityActions.enqueue(action: "extend", planId: planId)
      await TickleLiveActivityController.shared.extend(planId: planId, minutes: 10)
    #endif
    return .result()
  }
}
