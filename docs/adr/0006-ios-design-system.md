# ADR-0006: iOS Design System — Apple-Inspired Single Accent

## Status
Accepted

## Context

The initial iOS UI used a custom "ocean" color palette (`oceanPrimary` = cyan #0891B2, `oceanDeep`, `oceanAccent` = emerald) with opacity-heavy cards and multi-color accents. While thematically appropriate for a fishing app, this diverged from Apple's Human Interface Guidelines and produced visual inconsistency:

- Three chromatic accent colors competed for attention
- Score badge used opacity layers (fill + stroke), reducing clarity
- Date pickers used border+fill combinations that looked hand-crafted
- No systematic typography tracking

`DESIGN.md` defines an Apple-inspired design system for this project with a single chromatic accent color and clean, minimal surfaces.

## Decision

Adopt the Apple-inspired design system from `DESIGN.md` across the iOS SwiftUI app:

1. **Single accent color**: Replace all custom ocean palette tokens with **Apple Blue (#0071E3)** as the sole interactive/highlight color. Score label colors (◎○△×) remain polychromatic because they are semantic data indicators, not interactive chrome.

2. **Score badge**: Solid-fill circle in the label's semantic color with white text. No opacity layers, no stroke ring.

3. **Date picker**: iOS Calendar-style circular selection — circular Apple Blue fill for selected date, plain for others. Score labels appear below the date in their semantic color.

4. **Typography**: Tighter letter-spacing (`tracking`) applied to headlines and body text per the DESIGN.md scale. System SF Pro (default) respected for Dynamic Type and optical sizing.

5. **Cards**: Keep `Color(.secondarySystemGroupedBackground)` which adapts to dark mode; 14px corner radius; no visible border (follow Apple's borderless card convention).

6. **Chart/graph accent**: Tide chart line and area gradient use Apple Blue.

7. **App-wide tint**: `.tint(.appleBlue)` set at the root `ContentView` so tab bar, navigation, toggles, and sliders all follow the single accent automatically.

## Consequences

- All `oceanPrimary`, `oceanDeep`, `oceanAccent` tokens removed from `AppTheme.swift` and all View files.
- The fishing theme is expressed through content (fish icons, wave charts, tide data) rather than color.
- Dark mode compatibility is preserved because system background colors are unchanged.
- Future additions must use `Color.appleBlue` for interactive elements and refrain from introducing new accent colors (per DESIGN.md §7).
