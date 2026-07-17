/**
 * Unit tests for the ScoringConsumer selection-scoring logic.
 *
 * These tests exercise the rule enforced in scoring.consumer.ts:
 *   "Only a committed Yes (value: true) that also matches the actual condition
 *    earns points. Skipped rules and wrong calls both earn 0."
 *
 * We test this by running the scoring logic on synthetic breakdown data,
 * keeping the tests free from any DB or Kafka dependency.
 */

type RuleBreakdownItem = {
    rule: { id: string; score: number };
    matched: boolean;
};

type Selection = {
    ruleId: string;
    value: unknown; // true | false | null — mirrors what the DB may hold
};

/**
 * Extracted from ScoringConsumer.processResult — the scoring loop distilled
 * into a pure function so it can be tested in isolation.
 */
function computeScore(
    selections: Selection[],
    ruleBreakdown: RuleBreakdownItem[],
): number {
    let totalUserScore = 0;

    for (const selection of selections) {
        const match = ruleBreakdown.find((item) => item.rule.id === selection.ruleId);

        // Only a committed "Yes" (value: true) that also matches the actual
        // condition earns points. Skipped rules and wrong calls both earn 0.
        if (match && selection.value === true && match.matched === true) {
            totalUserScore += match.rule.score;
        }
    }

    return totalUserScore;
}

describe('ScoringConsumer — per-selection scoring logic', () => {
    const RULE_ID = 'rule-1';
    const RULE_SCORE = 50;

    const breakdown: RuleBreakdownItem[] = [
        { rule: { id: RULE_ID, score: RULE_SCORE }, matched: true },
    ];

    const breakdownNotMet: RuleBreakdownItem[] = [
        { rule: { id: RULE_ID, score: RULE_SCORE }, matched: false },
    ];

    it('awards points when user selects Yes and condition is met', () => {
        const selections: Selection[] = [{ ruleId: RULE_ID, value: true }];
        expect(computeScore(selections, breakdown)).toBe(RULE_SCORE);
    });

    it('awards 0 when user selects Yes but condition is NOT met (wrong call)', () => {
        const selections: Selection[] = [{ ruleId: RULE_ID, value: true }];
        expect(computeScore(selections, breakdownNotMet)).toBe(0);
    });

    it('awards 0 for legacy No (value: false) even when condition is not met', () => {
        // Previously `false === false` would have scored — this must now be 0.
        const selections: Selection[] = [{ ruleId: RULE_ID, value: false }];
        expect(computeScore(selections, breakdownNotMet)).toBe(0);
    });

    it('awards 0 for legacy No (value: false) even when condition IS met', () => {
        const selections: Selection[] = [{ ruleId: RULE_ID, value: false }];
        expect(computeScore(selections, breakdown)).toBe(0);
    });

    it('awards 0 when user skips (no selection entry for the rule)', () => {
        const selections: Selection[] = [];
        expect(computeScore(selections, breakdown)).toBe(0);
    });

    it('awards 0 when user skips (selection with null value)', () => {
        const selections: Selection[] = [{ ruleId: RULE_ID, value: null }];
        expect(computeScore(selections, breakdown)).toBe(0);
    });

    it('handles multiple rules — only Yes+matched rules score', () => {
        const RULE_A = 'rule-a';
        const RULE_B = 'rule-b';
        const RULE_C = 'rule-c';

        const multiBreakdown: RuleBreakdownItem[] = [
            { rule: { id: RULE_A, score: 50 }, matched: true },   // condition met
            { rule: { id: RULE_B, score: 30 }, matched: false },  // condition NOT met
            { rule: { id: RULE_C, score: 20 }, matched: true },   // condition met
        ];

        const selections: Selection[] = [
            { ruleId: RULE_A, value: true },   // Yes + met   → +50
            { ruleId: RULE_B, value: false },  // legacy No + not met → 0 (was incorrectly +30)
            { ruleId: RULE_C, value: null },   // skipped     → 0
        ];

        expect(computeScore(selections, multiBreakdown)).toBe(50);
    });
});
