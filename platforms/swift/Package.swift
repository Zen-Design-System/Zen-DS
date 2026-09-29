// swift-tools-version:5.9
// Zen design tokens for SwiftUI. Data and names are generated (npm run tokens:native).
import PackageDescription

let package = Package(
    name: "ZenTokens",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [.library(name: "ZenTokens", targets: ["ZenTokens"])],
    targets: [
        .target(name: "ZenTokens"),
        .testTarget(name: "ZenTokensTests", dependencies: ["ZenTokens"], resources: [.copy("vectors.json")]),
    ]
)
