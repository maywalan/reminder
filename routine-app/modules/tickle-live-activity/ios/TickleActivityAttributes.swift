import ActivityKit
import Foundation

// KEEP IN SYNC with targets/widget/TickleActivityAttributes.swift. ActivityKit matches the app's
// and the widget extension's attributes by type name + Codable shape, and the widget can't link
// this pod, so the struct is declared once per side.
@available(iOS 16.1, *)
public struct TickleActivityAttributes: ActivityAttributes, Hashable {
  public struct ContentState: Codable, Hashable {
    /// "upcoming" (counting down to start) or "live" (running, counting down to end).
    public var phase: String
    public var start: Date
    /// nil for a point reminder.
    public var end: Date?
    public var updatedAt: Date
  }

  public var planId: String
  public var title: String
  public var groupName: String?
  /// Plan colours, precomputed in JS (src/components/home/tokens.ts planPalette) so the Live
  /// Activity uses exactly the Home screen's colours.
  public var baseHex: String
  public var textHex: String
  public var tintHex: String
  public var trackHex: String
  public var pillBorderHex: String
  public var pillTextHex: String
}
