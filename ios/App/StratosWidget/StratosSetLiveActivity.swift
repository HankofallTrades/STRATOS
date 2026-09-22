import ActivityKit
import SwiftUI
import WidgetKit

/// The running workout on the lock screen: which lift, which set of the
/// session, what to hit, and one tap to log it.
struct StratosSetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StratosSetActivityAttributes.self) { context in
            SetLockScreenView(state: context.state)
                // No implicit animation on a content update. The system
                // crossfades a changed Live Activity by default, which on a
                // stepper reads as the number taking a moment to decide — the
                // tap is already the feedback, and the number should simply be
                // the new one.
                .transaction { $0.animation = nil }
                .activityBackgroundTint(Color.stratosStone)
                .activitySystemActionForegroundColor(Color.stratosMoss)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.current.exerciseName)
                        .font(.headline)
                        .foregroundStyle(Color.stratosMoss)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.setCount)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(Color.stratosMuted)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .center) {
                        TargetControls(state: context.state)
                        Spacer(minLength: 12)
                        DoneButton(state: context.state)
                    }
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
                Text(state.current.exerciseName)
                    .font(.headline)
                    .foregroundStyle(Color.stratosMoss)
                    .lineLimit(1)
                Spacer(minLength: 12)
                Text(state.setCount)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(Color.stratosMuted)
            }

            HStack(alignment: .center, spacing: 12) {
                TargetControls(state: state)
                    // The numbers and their buttons get the width first; the
                    // Done button is a fixed 56 and needs no share of what is
                    // left over.
                    .layoutPriority(1)
                Spacer(minLength: 8)
                DoneButton(state: state)
            }
        }
        .padding(16)
    }
}

/// What the set is aiming at: steppers while it can still be changed, one line
/// once it cannot.
///
/// The two are the same information, so they are not shown together. A set that
/// is logged, or that has no target worth logging, has nothing to step — and on
/// a lock screen a control that does nothing is worse than no control.
private struct TargetControls: View {
    let state: StratosSetActivityAttributes.ContentState

    var body: some View {
        let fields = state.stepperFields

        if fields.isEmpty {
            Text(state.targetLine)
                .font(.system(size: 34, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Color.stratosMoss)
        } else {
            HStack(alignment: .top, spacing: 26) {
                ForEach(fields) { field in
                    TargetStepper(setId: state.current.setId, field: field)
                }
            }
        }
    }
}

/// One adjustable number, with its two taps beneath it.
///
/// Value over controls rather than value between them: a lock screen is read at
/// a glance and tapped with a thumb, and stacking this way lets the numbers sit
/// side by side to be compared while giving each button a full row of its own
/// to be hit in.
///
/// The buttons carry a direction and not a number: how far a tap moves the
/// value is the app's rule, resolved into the plan long before the phone was
/// locked.
private struct TargetStepper: View {
    let setId: String
    let field: StepperField

    var body: some View {
        VStack(spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(field.text)
                    .font(.system(size: 28, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Color.stratosMoss)
                if !field.unit.isEmpty {
                    Text(field.unit)
                        .font(.caption)
                        .foregroundStyle(Color.stratosMuted)
                }
            }
            // Never truncated. Two digits of reps is normal, and the unit
            // eliding to "..." is the row giving up its width to the Done
            // button rather than there being no room for it.
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)

            HStack(spacing: 8) {
                StepButton(setId: setId, field: field, direction: -1, symbol: "minus")
                StepButton(setId: setId, field: field, direction: 1, symbol: "plus")
            }
        }
    }
}

private struct StepButton: View {
    let setId: String
    let field: StepperField
    let direction: Int
    let symbol: String

    var body: some View {
        Button(
            intent: StratosAdjustSetIntent(
                setId: setId,
                field: field.field,
                direction: direction
            )
        ) {
            Image(systemName: symbol)
                .font(.footnote.weight(.bold))
                .foregroundStyle(Color.stratosMoss)
                .frame(width: 34, height: 34)
                .background(Color.stratosMoss.opacity(0.12), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            "\(direction > 0 ? "Increase" : "Decrease") \(field.accessibilityName)"
        )
    }
}

/// One stepper's worth of the current target, ready to draw.
private struct StepperField: Identifiable {
    /// A `SetTarget` field name, which is what the intent carries.
    let field: String
    let text: String
    let unit: String
    let accessibilityName: String

    var id: String { field }
}

/// One tap to log the set the lock screen is showing.
///
/// The button names the set it was drawn for rather than meaning "whatever is
/// current", so a tap that lands on a render the activity has already moved
/// past logs nothing instead of logging the next set by accident.
///
/// It disappears once the set is logged. Nothing redraws it into a second
/// chance: the activity is updated from the app's process the moment the
/// journal is written, so the gap between a tap and the button going is the
/// only window, and a tap in it is refused by the set id anyway.
private struct DoneButton: View {
    let state: StratosSetActivityAttributes.ContentState

    var body: some View {
        if !state.isLogged && state.current.loggable {
            Button(intent: StratosCompleteSetIntent(setId: state.current.setId)) {
                Image(systemName: "checkmark")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.stratosStone)
                    .frame(width: 56, height: 56)
                    .background(Color.stratosAccent, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Log set \(state.current.position) of \(state.totalSets)")
        }
    }
}

private extension StratosSetActivityAttributes.ContentState {
    /// "Set 7 of 12" for the session, not for the exercise — on a locked phone
    /// the useful question is how much of the workout is left.
    var setCount: String { "Set \(current.position) of \(totalSets)" }

    /// What this set is aiming at, as one line, or its own number when there is
    /// nothing to show. Formatting only: the numbers arrive decided.
    var targetLine: String {
        switch current.kind {
        case "strength":
            let reps = target.reps.map { "\($0) reps" }
            let weight = target.weight.map { "\(formatWeight($0)) kg" }
            let parts = [reps, weight].compactMap { $0 }
            return parts.isEmpty ? "Set \(current.setNumber)" : parts.joined(separator: " × ")
        case "time", "cardio":
            guard let seconds = target.timeSeconds else { return "Set \(current.setNumber)" }
            return formatDuration(seconds)
        default:
            // A kind this build does not know: an activity can outlive the app
            // that started it. Say only what is certainly true.
            return "Set \(current.setNumber)"
        }
    }

    /// The steppers to draw, in reading order, and none at all for a set that
    /// cannot be changed any more.
    ///
    /// A field appears only when the plan gave it a step *and* the set has a
    /// number to step from. Both halves matter: a hold has no reps to move, and
    /// a set with no weight resolved would otherwise gain one out of nowhere.
    var stepperFields: [StepperField] {
        guard !isLogged, current.loggable else { return [] }

        let step = current.adjustment.step
        var fields: [StepperField] = []

        if let reps = target.reps, step.reps != nil {
            fields.append(
                StepperField(
                    field: StratosSetTargetField.reps,
                    text: "\(reps)",
                    unit: "reps",
                    accessibilityName: "reps"
                )
            )
        }
        if let weight = target.weight, step.weight != nil {
            fields.append(
                StepperField(
                    field: StratosSetTargetField.weight,
                    text: formatWeight(weight),
                    unit: "kg",
                    accessibilityName: "weight"
                )
            )
        }
        if let seconds = target.timeSeconds, step.timeSeconds != nil {
            fields.append(
                StepperField(
                    field: StratosSetTargetField.timeSeconds,
                    text: formatDuration(seconds),
                    unit: "",
                    accessibilityName: current.kind == "cardio" ? "duration" : "hold time"
                )
            )
        }

        return fields
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
