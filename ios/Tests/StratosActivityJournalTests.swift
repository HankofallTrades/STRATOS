import XCTest
@testable import StratosActivityCore

final class StratosActivityJournalTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suite: String!
    private let journalKey = "stratos.liveActivity.journal.v3"

    override func setUp() {
        super.setUp()
        suite = "StratosActivityJournalTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)!
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
        defaults = nil
        super.tearDown()
    }

    private func entry() -> StratosActivityJournalEntry {
        let target = StratosSetTarget(reps: 8, weight: 40, timeSeconds: nil, distanceKm: nil)
        let set = StratosPlannedSet(
            setId: "a1", workoutExerciseId: "a", exerciseName: "Squat",
            kind: "strength", setNumber: 1, position: 1,
            target: target, adjustment: StratosSetAdjustment(step: target, floor: target),
            completed: false, loggable: true
        )
        return StratosActivityJournalEntry(completing: set, target: target)
    }

    func testMissingAndSuccessfullyReadEmptyJournalAreEmpty() throws {
        let store = StratosActivityStore(defaults: defaults)
        XCTAssertEqual(try store.journal(), [])
        defaults.set(Data("[]".utf8), forKey: journalKey)
        XCTAssertEqual(try store.journal(), [])
    }

    func testUnreadableJournalFailsWithoutLosingRecordedData() {
        let store = StratosActivityStore(defaults: defaults)
        // Invalid JSON and valid JSON with an unreadable entry both leave the
        // lock-screen actions unknown, rather than meaning no actions occurred.
        for bytes in [Data("broken".utf8), Data("[{}]".utf8)] {
            defaults.set(bytes, forKey: journalKey)
            XCTAssertThrowsError(try store.journal())
            XCTAssertThrowsError(try store.append(entry()))
            XCTAssertThrowsError(try store.clearJournal(throughId: "a1"))
            XCTAssertEqual(defaults.data(forKey: journalKey), bytes)
        }
    }

    func testWrongStoredTypeIsNotMistakenForMissingStorage() {
        defaults.set("unreadable journal", forKey: journalKey)
        XCTAssertThrowsError(try StratosActivityStore(defaults: defaults).journal())
        XCTAssertEqual(defaults.string(forKey: journalKey), "unreadable journal")
    }

    func testReadCanRecoverAndClearOnlyTheEntriesAlreadyRead() throws {
        let store = StratosActivityStore(defaults: defaults)
        defaults.set(Data("broken".utf8), forKey: journalKey)
        XCTAssertThrowsError(try store.journal())

        let first = entry()
        defaults.set(try JSONEncoder().encode([first]), forKey: journalKey)
        XCTAssertEqual(try store.journal(), [first])
        let later = entry()
        try store.append(later)
        try store.clearJournal(throughId: first.id)
        XCTAssertEqual(try store.journal(), [later])
    }
}
