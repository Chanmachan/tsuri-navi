import SwiftUI

// MARK: - Design System: Apple-Inspired (ADR-0006)
// Single chromatic accent: Apple Blue (#0071E3).
// Score label colors are semantic/informational (data) and remain polychromatic.

extension Color {
    // MARK: - Interactive Accent
    /// Apple Blue — the sole interactive accent color. #0071E3
    /// Use for buttons, links, selection indicators, toggle tints, and any interactive chrome.
    static let appleBlue = Color(red: 0 / 255, green: 113 / 255, blue: 227 / 255)

    // MARK: - Score Label Colors (informational, not interactive)
    /// Returns the display color for a fishing-condition score label.
    /// Uses iOS system color values for dark-mode harmony.
    static func scoreColor(for label: String) -> Color {
        switch label {
        case "◎": return Color(red: 52 / 255,  green: 199 / 255, blue: 89 / 255)   // system green
        case "○": return Color(red: 0 / 255,   green: 122 / 255, blue: 255 / 255)  // system blue
        case "△": return Color(red: 255 / 255, green: 159 / 255, blue: 10 / 255)   // system orange
        default:  return Color(red: 255 / 255, green: 59 / 255,  blue: 48 / 255)   // system red
        }
    }
}
