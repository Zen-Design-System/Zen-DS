import Foundation
import XCTest
@testable import ZenTokens

// The vectors are the JavaScript reference resolver's answers (scripts/build-native-tokens.mjs).
final class ZenTokensTests: XCTestCase {
    private struct Vector: Decodable {
        let name: String
        let context: [String: String]
        let type: String
        let expected: JSONValue
    }

    private enum JSONValue: Decodable, Equatable {
        case string(String), number(Double), bool(Bool)
        init(from decoder: Decoder) throws {
            let box = try decoder.singleValueContainer()
            if let value = try? box.decode(Bool.self) { self = .bool(value) }
            else if let value = try? box.decode(Double.self) { self = .number(value) }
            else { self = .string(try box.decode(String.self)) }
        }
    }

    func testMatchesTheReferenceResolver() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "vectors", withExtension: "json"))
        let vectors = try JSONDecoder().decode([Vector].self, from: Data(contentsOf: url))
        XCTAssertGreaterThan(vectors.count, 100)
        for vector in vectors {
            let context = ZenContext(vector.context)
            switch vector.type {
            case "COLOR":
                XCTAssertEqual(ZenTokens.shared.hex(vector.name, context).map(JSONValue.string), vector.expected, vector.name)
                XCTAssertNotNil(ZenTokens.shared.color(vector.name, context), vector.name)
            case "FLOAT":
                XCTAssertEqual(ZenTokens.shared.number(vector.name, context).map(JSONValue.number), vector.expected, vector.name)
            case "STRING":
                XCTAssertEqual(ZenTokens.shared.string(vector.name, context).map(JSONValue.string), vector.expected, vector.name)
            case "BOOLEAN":
                XCTAssertEqual(ZenTokens.shared.bool(vector.name, context).map(JSONValue.bool), vector.expected, vector.name)
            default:
                XCTFail("unknown type \(vector.type)")
            }
        }
    }

    func testEveryNameConstantExists() {
        XCTAssertGreaterThan(ZenTokens.shared.tokenCount, 2000)
        XCTAssertNotNil(ZenTokens.shared.resolve(ZenToken.spacingGap2XSmall))
    }
}
