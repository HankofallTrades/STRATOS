import ActivityKit
import SwiftUI
import WidgetKit

/// The running workout on the lock screen: which lift, which set of the
/// session, and what to hit. Display only — the buttons come later.
struct StratosSetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StratosSetActivityAttributes.self) { context in
            SetLockScreenView(state: context.state)
                .activityBackgroundTint(Color.stratosStone)
                .activitySystemActionForegroundColor(Color.stratosMoss)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.exerciseName)
                        .font(.headline)
                        .foregroundStyle(Color.stratosMoss)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.setCount)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(Color.stratosMuted)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.target)
                        .font(.title2.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Color.stratosMoss)
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(Color.stratosAccent)
            } compactTrailing: {
                Text(context.state.setCount)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(Color.stratosMuted)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(Color.stratosAccent)
            }
        }
    }
}

private struct SetLockScreenView: View {
    let state: StratosSetActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(state.exerciseName)
                    .font(.headline)
                    .foregroundStyle(Color.stratosMoss)
                    .lineLimit(1)
                Spacer(minLength: 12)
                Text(state.setCount)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(Color.stratosMuted)
            }

            Text(state.target)
                .font(.system(size: 34, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Color.stratosMoss)
        }
        .padding(16)
    }
}

private extension StratosSetActivityAttributes.ContentState {
    /// "Set 7 of 12" for the session, not for the exercise — on a locked phone
    /// the useful question is how much of the workout is left.
    var setCount: String { "Set \(position) of \(totalSets)" }

    /// The suggestion as one line, or the set's own number when there is
    /// nothing to suggest. Formatting only: the numbers arrive decided.
    var target: String {
        switch kind {
        case .strength:
            let reps = suggestedReps.map { "\($0) reps" }
            let weight = suggestedWeight.map { "\(formatWeight($0)) kg" }
            let parts = [reps, weight].compactMap { $0 }
            return parts.isEmpty ? "Set \(setNumber)" : parts.joined(separator: " × ")
        case .time, .cardio:
            guard let seconds = suggestedTimeSeconds else { return "Set \(setNumber)" }
            return formatDuration(seconds)
        }
    }
}

/// Plates come in halves, so 82.5 has to survive; 80 must not read as "80.0".
private func formatWeight(_ weight: Double) -> String {
    weight.rounded() == weight
        ? String(Int(weight))
        : String(format: "%.1f", weight)
}

private func formatDuration(_ seconds: Int) -> String {
    seconds < 60
        ? "\(seconds)s"
        : String(format: "%d:%02d", seconds / 60, seconds % 60)
}

// The app's stone-and-pthalo palette, from the Mythos theme in
// src/lib/themes/themes.ts. The widget runs in its own process and cannot read
// the app's CSS, so these are restated here.
private extension Color {
    static let stratosStone = Color(red: 0.059, green: 0.075, blue: 0.102) // background #0F131A
    static let stratosMoss = Color(red: 0.922, green: 0.961, blue: 0.925) // foreground #EBF5EC
    /// Primary pthalo (#154F47) lifted to hsl(172 58% 38%). The theme value is
    /// a fill sitting under app text; here it tints a glyph on the system's own
    /// backdrop, where the unlifted colour reads as near-black.
    static let stratosAccent = Color(red: 0.157, green: 0.600, blue: 0.553)
    static let stratosMuted = Color(red: 0.573, green: 0.620, blue: 0.588) // mutedForeground
}
