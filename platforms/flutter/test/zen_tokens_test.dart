import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Brightness;

import 'package:flutter/widgets.dart' show MediaQueryData;
import 'package:flutter_test/flutter_test.dart';
import 'package:zen_tokens/zen_tokens.dart';

// The vectors are the JavaScript reference resolver's answers (scripts/build-native-tokens.mjs).
void main() {
  test('matches the reference resolver', () {
    final vectors = jsonDecode(File('test/vectors.json').readAsStringSync()) as List<dynamic>;
    expect(vectors.length, greaterThan(100));
    for (final raw in vectors) {
      final vector = raw as Map<String, dynamic>;
      final name = vector['name'] as String;
      final context = ZenContext(Map<String, String>.from(vector['context'] as Map));
      final tokens = ZenTokens.instance;
      switch (vector['type'] as String) {
        case 'COLOR':
          expect(tokens.hex(name, context), vector['expected'], reason: name);
          expect(tokens.color(name, context), isNotNull, reason: name);
        case 'FLOAT':
          expect(tokens.number(name, context), (vector['expected'] as num).toDouble(), reason: name);
        case 'STRING':
          expect(tokens.string(name, context), vector['expected'], reason: name);
        case 'BOOLEAN':
          expect(tokens.boolean(name, context), vector['expected'], reason: name);
        default:
          fail('unknown type ' + vector['type'].toString());
      }
    }
  });

  test('text styles match the reference resolver', () {
    final vectors = jsonDecode(File('test/text-style-vectors.json').readAsStringSync()) as List<dynamic>;
    expect(vectors.length, greaterThan(100));
    for (final raw in vectors) {
      final vector = raw as Map<String, dynamic>;
      final name = vector['name'] as String;
      final context = ZenContext(Map<String, String>.from(vector['context'] as Map));
      final expected = vector['expected'] as Map<String, dynamic>;
      final style = ZenTokens.instance.textStyle(name, context);
      expect(style, isNotNull, reason: name);
      expect(style!.family, expected['family'], reason: name);
      expect(style.size, closeTo((expected['size'] as num).toDouble(), 1e-9), reason: name);
      expect(style.weight, closeTo((expected['weight'] as num).toDouble(), 1e-9), reason: name);
      expect(style.lineHeight, closeTo((expected['lineHeight'] as num).toDouble(), 1e-9), reason: name);
      expect(style.letterSpacing, closeTo((expected['letterSpacing'] as num).toDouble(), 1e-9), reason: name);
      expect(style.uppercase, expected['uppercase'], reason: name);
    }
  });

  test('every name constant exists', () {
    expect(ZenTokens.instance.tokenCount, greaterThan(2000));
    expect(ZenTokens.instance.resolve(ZenToken.spacingGap2XSmall), isNotNull);
  });

  test('the system appearance picks Dark and Zen-High-Contrast', () {
    final base = ZenContext.standard.withMode(ZenCollection.cornerRadius, 'Smooth');
    final increased = base.withSystem(brightness: Brightness.dark, highContrast: true);
    expect(increased.modes['mode-colors-semantic'], 'Dark');
    expect(increased.modes['global-colors'], 'Zen-High-Contrast');
    expect(increased.modes['corner-radius'], 'Smooth');
    final standard = ZenContext.fromMediaQuery(const MediaQueryData(platformBrightness: Brightness.light), base);
    expect(standard.modes['mode-colors-semantic'], 'Light');
    expect(standard.modes['global-colors'], 'Zen');
    // A colour the high-contrast palette darkens resolves to its high-contrast value.
    expect(ZenTokens.instance.hex(ZenToken.colorContentAccentLight, ZenContext.highContrast), isNot(ZenTokens.instance.hex(ZenToken.colorContentAccentLight)));
  });
}
