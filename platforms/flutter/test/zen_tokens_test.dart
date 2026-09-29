import 'dart:convert';
import 'dart:io';

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

  test('every name constant exists', () {
    expect(ZenTokens.instance.tokenCount, greaterThan(2000));
    expect(ZenTokens.instance.resolve(ZenToken.spacingGap2XSmall), isNotNull);
  });
}
