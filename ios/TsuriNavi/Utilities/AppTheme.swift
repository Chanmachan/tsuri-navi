import SwiftUI

// MARK: - Ocean Design Tokens
// Color palette inspired by calm sea fishing environments.

extension Color {
    /// Primary interactive color – calm ocean cyan (#0891B2)
    static let oceanPrimary = Color(red: 8 / 255, green: 145 / 255, blue: 178 / 255)
    /// Deep ocean – used for prominent text (#164E63)
    static let oceanDeep    = Color(red: 22 / 255, green: 78 / 255,  blue: 99 / 255)
    /// Seafoam accent – emerald green (#059669)
    static let oceanAccent  = Color(red: 5 / 255,  green: 150 / 255, blue: 105 / 255)

    /// Returns a semantic color for a fishing-condition score label.
    static func scoreColor(for label: String) -> Color {
        switch label {
        case "◎": return Color(red: 5 / 255,   green: 150 / 255, blue: 105 / 255)  // emerald-600
        case "○": return Color(red: 2 / 255,   green: 132 / 255, blue: 199 / 255)  // sky-600
        case "△": return Color(red: 217 / 255, green: 119 / 255, blue: 6 / 255)    // amber-600
        default:  return Color(red: 239 / 255, green: 68 / 255,  blue: 68 / 255)   // red-500
        }
    }
}
