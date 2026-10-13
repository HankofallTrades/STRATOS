import XCTest
@testable import StratosActivityCore

final class StratosActivityCursorTests: XCTestCase {
    private func set(_ id: String, completed: Bool = false) -> StratosPlannedSet {
        let target = StratosSetTarget(reps: 8, weight: 40, timeSeconds: nil, distanceKm: nil)
        return StratosPlannedSet(
            setId: id, workoutExerciseId: String(id.prefix(1)), exerciseName: id,
            kind: "strength", setNumber: Int(String(id.suffix(1)))!, position: 1,
            target: target, adjustment: StratosSetAdjustment(step: target, floor: target),
            completed: completed, loggable: true
        )
    }

    func testDoneWalksSupersetRoundsInDeliveredOrder() {
        let plan = [set("a1"), set("b1"), set("a2"), set("b2"), set("c1")]
        var journal: [StratosActivityJournalEntry] = []
        var visited: [String] = []
        for _ in plan {
            let current = StratosActivityCursor.current(plan: plan, journal: journal)!
            visited.append(current.setId)
            journal.append(StratosActivityJournalEntry(completing: current, target: current.target))
        }
        XCTAssertEqual(visited, ["a1", "b1", "a2", "b2", "c1"])
        XCTAssertEqual(StratosActivityCursor.current(plan: plan, journal: journal)?.setId, "c1")
    }

    func testOutOfOrderCompletionLeavesTheFirstGapCurrent() {
        let plan = [set("a1", completed: true), set("b1"), set("a2"), set("b2")]
        let journal = [StratosActivityJournalEntry(completing: plan[2], target: plan[2].target)]
        XCTAssertEqual(StratosActivityCursor.current(plan: plan, journal: journal)?.setId, "b1")
        XCTAssertNil(StratosActivityCursor.current(plan: [], journal: journal))
    }

    func testAdjustmentDoesNotAdvanceThePair() {
        let plan = [set("a1"), set("b1")]
        let journal = [StratosActivityJournalEntry(adjusting: plan[0], to: plan[0].target)]
        XCTAssertEqual(StratosActivityCursor.current(plan: plan, journal: journal)?.setId, "a1")
    }
}
