// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "StratosActivityCore",
    platforms: [.macOS(.v13)],
    targets: [
        .target(
            name: "StratosActivityCore",
            path: "App/Shared",
            exclude: ["StratosAdjustSetIntent.swift", "StratosCompleteSetIntent.swift", "StratosSetActivityController.swift"],
            sources: ["StratosSetActivityAttributes.swift", "StratosActivityJournal.swift"]
        ),
        .testTarget(name: "StratosActivityCoreTests", dependencies: ["StratosActivityCore"], path: "Tests")
    ]
)
