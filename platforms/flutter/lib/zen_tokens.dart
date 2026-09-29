import 'dart:convert';
import 'dart:ui' show Color;

import 'src/zen_token_data.dart';

export 'src/zen_token_names.dart';

// Hand-written engine; the data and the names beside it are generated (scripts/build-native-tokens.mjs).

/// The active mode of each collection, like the data-* attributes on the web. A collection that is not listed uses its first mode.
class ZenContext {
  const ZenContext([this.modes = const {}]);

  final Map<String, String> modes;

  static const ZenContext standard = ZenContext();
  static const ZenContext dark = ZenContext({'mode-colors-semantic': 'Dark'});

  ZenContext withMode(String collection, String mode) => ZenContext({...modes, collection: mode});
}

class ZenResolved {
  const ZenResolved(this.type, this.value);

  /// The Figma type: COLOR, FLOAT, STRING or BOOLEAN.
  final String type;
  final Object? value;
}

class ZenTokens {
  ZenTokens._() {
    final root = jsonDecode(zenTokenData) as Map<String, dynamic>;
    _modesOf = (root['collections'] as Map<String, dynamic>).map((key, value) => MapEntry(key, List<String>.from(value as List)));
    _entries = (root['tokens'] as Map<String, dynamic>).map((key, value) => MapEntry(key, value as List<dynamic>));
  }

  static final ZenTokens instance = ZenTokens._();

  late final Map<String, List<String>> _modesOf;
  late final Map<String, List<dynamic>> _entries;

  int get tokenCount => _entries.length;

  /// Follows aliases with the modes of the context and returns the concrete value with its Figma type.
  ZenResolved? resolve(String name, [ZenContext context = ZenContext.standard]) {
    var current = name;
    for (var i = 0; i < 32; i++) {
      final entry = _entries[current];
      if (entry == null) return null;
      final collection = entry[0] as String;
      final values = entry[2] as Map<String, dynamic>;
      var mode = (_modesOf[collection] ?? const <String>[]).isEmpty ? '' : _modesOf[collection]!.first;
      final wanted = context.modes[collection];
      if (wanted != null && values.containsKey(wanted)) mode = wanted;
      final value = values[mode] ?? (values.isEmpty ? null : values.values.first);
      if (value is String && value.startsWith('{') && value.endsWith('}')) {
        current = value.substring(1, value.length - 1);
        continue;
      }
      return ZenResolved(entry[1] as String, value);
    }
    return null;
  }

  String? hex(String name, [ZenContext context = ZenContext.standard]) {
    final found = resolve(name, context);
    return found != null && found.type == 'COLOR' ? found.value as String? : null;
  }

  Color? color(String name, [ZenContext context = ZenContext.standard]) {
    final text = hex(name, context);
    return text == null ? null : zenColorFromHex(text);
  }

  double? number(String name, [ZenContext context = ZenContext.standard]) {
    final found = resolve(name, context);
    return found != null && found.type == 'FLOAT' ? (found.value as num).toDouble() : null;
  }

  String? string(String name, [ZenContext context = ZenContext.standard]) {
    final found = resolve(name, context);
    return found != null && found.type == 'STRING' ? found.value as String? : null;
  }

  bool? boolean(String name, [ZenContext context = ZenContext.standard]) {
    final found = resolve(name, context);
    return found != null && found.type == 'BOOLEAN' ? found.value as bool? : null;
  }
}

/// "#RRGGBB" or "#RRGGBBAA" (the order the Figma export and the CSS use).
Color? zenColorFromHex(String text) {
  final digits = text.startsWith('#') ? text.substring(1) : text;
  if (digits.length != 6 && digits.length != 8) return null;
  final bits = int.tryParse(digits, radix: 16);
  if (bits == null) return null;
  if (digits.length == 8) {
    final alpha = bits & 0xFF;
    return Color((alpha << 24) | (bits >> 8));
  }
  return Color(0xFF000000 | bits);
}
