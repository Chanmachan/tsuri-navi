import SwiftUI
import UIKit

// MARK: - Design System: Apple-Inspired (ADR-0006)
// Single chromatic accent: Apple Blue (#0071E3).
// Score label colors are semantic/informational (data) and remain polychromatic.

extension Color {
    // MARK: - Interactive Accent
    /// Apple Blue — the sole interactive accent color. #0071E3
    static let appleBlue = Color(red: 0 / 255, green: 113 / 255, blue: 227 / 255)

    // MARK: - Score Label Colors (informational, not interactive)

    /// Returns the background fill color for a fishing-condition score label.
    /// Uses UIColor system colors so fills adapt to dark mode and Increased Contrast settings.
    static func scoreColor(for label: String) -> Color {
        switch label {
        case "◎": return Color(UIColor.systemGreen)
        case "○": return Color(UIColor.systemBlue)
        case "△": return Color(UIColor.systemOrange)
        default:  return Color(UIColor.systemRed)
        }
    }

    /// Returns the foreground (text/icon) color for use on top of `scoreColor(for:)`.
    ///
    /// `systemGreen` and `systemOrange` are bright fills that require a dark label
    /// to satisfy the WCAG 3:1 large-text contrast ratio.
    /// `systemBlue` and `systemRed` are dark enough to pair with white.
    static func scoreTextColor(for label: String) -> Color {
        switch label {
        case "◎", "△": return Color(UIColor.label)  // dark text on bright fill
        default:        return .white
        }
    }
}
