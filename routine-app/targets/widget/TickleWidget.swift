import SwiftUI
import WidgetKit

/// The few words the widget + Live Activity draw themselves, in the app's chosen language — the RN
/// side writes `language` ("en" / "th") into the App Group on every sync (src/lib/widget-sync.ts).
/// Falls back to the phone's language before the app has synced once.
enum TickleL10n {
  static var isThai: Bool {
    if let lang = UserDefaults(suiteName: tickleAppGroup)?.string(forKey: "language") { return lang == "th" }
    return Locale.preferredLanguages.first?.hasPrefix("th") ?? false
  }

  static var now: String { isThai ? "ตอนนี้" : "Now" }
  static var nowLower: String { isThai ? "ตอนนี้" : "now" }
  static func starts(_ time: String) -> String { isThai ? "เริ่ม \(time)" : "starts \(time)" }
  static func ends(_ time: String) -> String { isThai ? "จบ \(time)" : "ends \(time)" }
  static func reminder(_ time: String) -> String { isThai ? "เตือน · \(time)" : "reminder · \(time)" }
  static var plus10: String { isThai ? "+10 นาที" : "+10 min" }
  static var done: String { isThai ? "เสร็จ" : "Done" }
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

@main
struct TickleWidgetBundle: WidgetBundle {
  var body: some Widget {
    TickleWidget()
    TickleCalendarWidget()
    TickleNext3Widget()
    // WidgetBundleBuilder only supports `if #available` from iOS 16.1 — an older version compiles
    // but hits SwiftUI's fatalError("Unavailable") stub and takes the whole extension down.
    if #available(iOS 16.1, *) {
      TickleLockWidget()
      TickleDateWidget()
    }
    if #available(iOS 16.2, *) {
      TickleLiveActivity()
    }
  }
}
