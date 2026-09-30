import ExpoModulesCore

struct LiveActivityPayloadRecord: Record {
  @Field var planId: String = ""
  @Field var title: String = ""
  @Field var groupName: String?
  @Field var baseHex: String = "#1B76E8"
  @Field var textHex: String = "#0F5FC4"
  @Field var tintHex: String = "#F4F8FE"
  @Field var trackHex: String = "#D1E4FA"
  @Field var pillBorderHex: String = "#BAD6F8"
  @Field var pillTextHex: String = "#0F5FC4"
  @Field var phase: String = "upcoming"
  @Field var startMs: Double = 0
  @Field var endMs: Double?
}

public class TickleLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TickleLiveActivity")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) { return TickleLiveActivityController.shared.areEnabled }
      return false
    }

    /// Show `payload`'s task as the one Live Activity (starting, updating or replacing as needed), or end all when null.
    AsyncFunction("sync") { (record: LiveActivityPayloadRecord?) async in
      guard #available(iOS 16.2, *) else { return }
      let payload = record.map {
        TickleLiveActivityPayload(
          planId: $0.planId, title: $0.title, groupName: $0.groupName, baseHex: $0.baseHex, textHex: $0.textHex,
          tintHex: $0.tintHex, trackHex: $0.trackHex, pillBorderHex: $0.pillBorderHex, pillTextHex: $0.pillTextHex,
          phase: $0.phase, start: Date(timeIntervalSince1970: $0.startMs / 1000),
          end: $0.endMs.map { Date(timeIntervalSince1970: $0 / 1000) })
      }
      await TickleLiveActivityController.shared.sync(payload)
    }

    /// Lock Screen button taps since the last call, oldest first — each `{ action: 'complete' | 'extend', planId, at }`.
    Function("takePendingActions") { () -> [[String: String]] in
      TickleLiveActivityActions.take()
    }
  }
}
