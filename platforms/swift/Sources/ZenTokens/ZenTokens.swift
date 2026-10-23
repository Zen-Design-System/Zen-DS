import Foundation
import SwiftUI

// Hand-written engine; the data and the names next to it are generated (scripts/build-native-tokens.mjs).

/// The active mode of each collection, like the data-* attributes on the web. A collection that is not listed uses its first mode.
public struct ZenContext: Equatable {
    public var modes: [String: String]
    public init(_ modes: [String: String] = [:]) { self.modes = modes }
    public static let standard = ZenContext()
    public static let dark = ZenContext([ZenCollection.modeColorsSemantic: "Dark"])
    /// Global Colors in its Zen-High-Contrast mode: the palette the web uses under prefers-contrast: more (ZenProvider contrast).
    public static let highContrast = ZenContext([ZenCollection.globalColors: "Zen-High-Contrast"])
    public func with(_ collection: String, _ mode: String) -> ZenContext {
        var copy = self
        copy.modes[collection] = mode
        return copy
    }
    /// The system's appearance on top of this context: Dark for a dark color scheme, Zen-High-Contrast when Increase
    /// Contrast is on (SwiftUI colorSchemeContrast; UIKit accessibilityContrast, see with(traits:)). Other modes stay.
    public func with(colorScheme: ColorScheme, contrast: ColorSchemeContrast) -> ZenContext {
        with(ZenCollection.modeColorsSemantic, colorScheme == .dark ? "Dark" : "Light")
            .with(ZenCollection.globalColors, contrast == .increased ? "Zen-High-Contrast" : "Zen")
    }
}

public final class ZenTokens {
    public static let shared = ZenTokens()

    private struct Entry {
        let collection: String
        let type: String
        let values: [String: Any]
    }

    private let entries: [String: Entry]
    private let modesOf: [String: [String]]
    private let textStyleDefs: [String: [String: Any]]

    private init() {
        guard let data = ZenTokenData.json.data(using: .utf8),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let collections = root["collections"] as? [String: [String]],
              let tokens = root["tokens"] as? [String: [Any]] else {
            fatalError("ZenTokens: the generated token data is not valid JSON")
        }
        var parsed: [String: Entry] = [:]
        for (name, item) in tokens {
            guard item.count == 3, let collection = item[0] as? String, let type = item[1] as? String, let values = item[2] as? [String: Any] else { continue }
            parsed[name] = Entry(collection: collection, type: type, values: values)
        }
        entries = parsed
        modesOf = collections
        textStyleDefs = root["textStyles"] as? [String: [String: Any]] ?? [:]
    }

    public var tokenCount: Int { entries.count }

    /// Follows aliases with the modes of the context and returns the concrete value with its Figma type (COLOR, FLOAT, STRING, BOOLEAN).
    public func resolve(_ name: String, _ context: ZenContext = .standard) -> (type: String, value: Any)? {
        var current = name
        for _ in 0..<32 {
            guard let entry = entries[current] else { return nil }
            let first = modesOf[entry.collection]?.first ?? ""
            var mode = first
            if let wanted = context.modes[entry.collection], entry.values[wanted] != nil { mode = wanted }
            guard let value = entry.values[mode] ?? entry.values.values.first else { return nil }
            if let text = value as? String, text.hasPrefix("{"), text.hasSuffix("}") {
                current = String(text.dropFirst().dropLast())
                continue
            }
            return (entry.type, value)
        }
        return nil
    }

    public func hex(_ name: String, _ context: ZenContext = .standard) -> String? {
        guard let found = resolve(name, context), found.type == "COLOR" else { return nil }
        return found.value as? String
    }

    public func color(_ name: String, _ context: ZenContext = .standard) -> Color? {
        guard let text = hex(name, context) else { return nil }
        return Color(zenHex: text)
    }

    public func number(_ name: String, _ context: ZenContext = .standard) -> Double? {
        guard let found = resolve(name, context), found.type == "FLOAT" else { return nil }
        return (found.value as? NSNumber)?.doubleValue
    }

    public func string(_ name: String, _ context: ZenContext = .standard) -> String? {
        guard let found = resolve(name, context), found.type == "STRING" else { return nil }
        return found.value as? String
    }

    public func bool(_ name: String, _ context: ZenContext = .standard) -> Bool? {
        guard let found = resolve(name, context), found.type == "BOOLEAN" else { return nil }
        return (found.value as? NSNumber)?.boolValue
    }

    /// A Figma text style resolved in the context (its size, weight, line height and letter spacing follow the typography mode).
    public func textStyle(_ name: String, _ context: ZenContext = .standard) -> ZenTextStyle? {
        guard let def = textStyleDefs[name],
              let familyToken = def["family"] as? String, let sizeToken = def["size"] as? String,
              let weightToken = def["weight"] as? String, let lineHeightToken = def["lineHeight"] as? String,
              let letterSpacingToken = def["letterSpacing"] as? String,
              let family = string(familyToken, context), let size = number(sizeToken, context),
              let weight = number(weightToken, context), let lineHeight = number(lineHeightToken, context),
              let letterSpacing = number(letterSpacingToken, context) else { return nil }
        return ZenTextStyle(family: family, size: size, weight: weight, lineHeight: lineHeight, letterSpacing: letterSpacing, uppercase: (def["uppercase"] as? Bool) ?? false)
    }
}

public struct ZenTextStyle: Equatable {
    public let family: String
    public let size: Double
    /// The Figma weight, for example 500 or 550.
    public let weight: Double
    /// Line height in points.
    public let lineHeight: Double
    /// Letter spacing in points.
    public let letterSpacing: Double
    public let uppercase: Bool

    /// Figma weights such as 450 or 550 snap to the nearest step SwiftUI has.
    public var fontWeight: Font.Weight {
        let step = Int(((weight + 50) / 100).rounded(.down)) * 100
        switch step {
        case ..<200: return .ultraLight
        case 200: return .thin
        case 300: return .light
        case 400: return .regular
        case 500: return .medium
        case 600: return .semibold
        case 700: return .bold
        case 800: return .heavy
        default: return .black
        }
    }

    /// The font by family name; SwiftUI falls back to the system font when the family is not installed.
    public var font: Font { Font.custom(family, size: size).weight(fontWeight) }

    /// Approximate: line height minus the natural line height of Inter (about 1.21 × size). SwiftUI has no exact line-height setter.
    public var lineSpacing: Double { max(0, lineHeight - size * 1.21) }
}

public extension Text {
    /// Font, letter spacing, line spacing and case of a Figma text style.
    @ViewBuilder func zenStyle(_ name: String, context: ZenContext = .standard) -> some View {
        if let style = ZenTokens.shared.textStyle(name, context) {
            self.font(style.font).kerning(style.letterSpacing).lineSpacing(style.lineSpacing).textCase(style.uppercase ? Text.Case.uppercase : nil)
        } else {
            self
        }
    }
}

public extension Color {
    /// "#RRGGBB" or "#RRGGBBAA" (the order the Figma export and the CSS use).
    init?(zenHex text: String) {
        var digits = text
        if digits.hasPrefix("#") { digits.removeFirst() }
        guard digits.count == 6 || digits.count == 8, let bits = UInt64(digits, radix: 16) else { return nil }
        let red: UInt64, green: UInt64, blue: UInt64, alpha: UInt64
        if digits.count == 8 {
            red = (bits >> 24) & 0xFF; green = (bits >> 16) & 0xFF; blue = (bits >> 8) & 0xFF; alpha = bits & 0xFF
        } else {
            red = (bits >> 16) & 0xFF; green = (bits >> 8) & 0xFF; blue = bits & 0xFF; alpha = 0xFF
        }
        self.init(.sRGB, red: Double(red) / 255, green: Double(green) / 255, blue: Double(blue) / 255, opacity: Double(alpha) / 255)
    }
}

private struct ZenContextKey: EnvironmentKey {
    static let defaultValue = ZenContext.standard
}

public extension EnvironmentValues {
    /// Set once near the root (for example ZenContext.dark) and read it wherever tokens are resolved.
    var zenContext: ZenContext {
        get { self[ZenContextKey.self] }
        set { self[ZenContextKey.self] = newValue }
    }
}

/// Follows the system: the base context plus Dark when the color scheme is dark and Zen-High-Contrast when Increase Contrast is on.
private struct ZenSystemContext: ViewModifier {
    let base: ZenContext
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var contrast
    func body(content: Content) -> some View {
        content.environment(\.zenContext, base.with(colorScheme: colorScheme, contrast: contrast))
    }
}

public extension View {
    func zenContext(_ context: ZenContext) -> some View { environment(\.zenContext, context) }
    /// Like the web's ZenProvider following the system: the color scheme picks Light or Dark and Increase Contrast picks
    /// Zen-High-Contrast, on top of the base context (a theme, a density, a radius). Set it once near the root.
    func zenSystemContext(_ base: ZenContext = .standard) -> some View { modifier(ZenSystemContext(base: base)) }
}

#if canImport(UIKit)
import UIKit

public extension ZenContext {
    /// UIKit: the trait collection's interface style (Dark) and accessibilityContrast (high → Zen-High-Contrast).
    func with(traits: UITraitCollection) -> ZenContext {
        with(ZenCollection.modeColorsSemantic, traits.userInterfaceStyle == .dark ? "Dark" : "Light")
            .with(ZenCollection.globalColors, traits.accessibilityContrast == .high ? "Zen-High-Contrast" : "Zen")
    }
}
#endif
