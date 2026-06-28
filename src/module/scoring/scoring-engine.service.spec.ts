import { ScoringEngineService, ScoringRule, PredictionSelection } from './scoring-engine.service';

describe('ScoringEngineService', () => {
    let service: ScoringEngineService;

    beforeEach(() => {
        service = new ScoringEngineService();
    });

    it('evaluates GT (Greater Than) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player A', metric: 'points', condition: 'GT', threshold: 5.5, score: 20 },
        ];
        
        // Match: 6 > 5.5
        const resultMatch = service.evaluate(rules, [{ player: 'Player A', metric: 'points', value: 6 }]);
        expect(resultMatch.totalScore).toBe(20);

        // No match: 5 <= 5.5
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player A', metric: 'points', value: 5 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('evaluates LT (Less Than) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player B', metric: 'turnovers', condition: 'LT', threshold: 3, score: 15 },
        ];

        // Match: 2 < 3
        const resultMatch = service.evaluate(rules, [{ player: 'Player B', metric: 'turnovers', value: 2 }]);
        expect(resultMatch.totalScore).toBe(15);

        // No match: 3 is not < 3
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player B', metric: 'turnovers', value: 3 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('evaluates EQ (Equal To) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player C', metric: 'assists', condition: 'EQ', threshold: 10, score: 30 },
        ];

        // Match: 10 === 10
        const resultMatch = service.evaluate(rules, [{ player: 'Player C', metric: 'assists', value: 10 }]);
        expect(resultMatch.totalScore).toBe(30);

        // No match: 9 !== 10
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player C', metric: 'assists', value: 9 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('evaluates GTE (Greater Than or Equal) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player D', metric: 'rebounds', condition: 'GTE', threshold: 8, score: 25 },
        ];

        // Match: 8 >= 8
        const resultMatch1 = service.evaluate(rules, [{ player: 'Player D', metric: 'rebounds', value: 8 }]);
        expect(resultMatch1.totalScore).toBe(25);

        // Match: 9 >= 8
        const resultMatch2 = service.evaluate(rules, [{ player: 'Player D', metric: 'rebounds', value: 9 }]);
        expect(resultMatch2.totalScore).toBe(25);

        // No match: 7 < 8
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player D', metric: 'rebounds', value: 7 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('evaluates LTE (Less Than or Equal) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player E', metric: 'fouls', condition: 'LTE', threshold: 2, score: 10 },
        ];

        // Match: 2 <= 2
        const resultMatch1 = service.evaluate(rules, [{ player: 'Player E', metric: 'fouls', value: 2 }]);
        expect(resultMatch1.totalScore).toBe(10);

        // Match: 1 <= 2
        const resultMatch2 = service.evaluate(rules, [{ player: 'Player E', metric: 'fouls', value: 1 }]);
        expect(resultMatch2.totalScore).toBe(10);

        // No match: 3 > 2
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player E', metric: 'fouls', value: 3 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('evaluates NEQ (Not Equal To) rules correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player F', metric: 'blocks', condition: 'NEQ', threshold: 0, score: 5 },
        ];

        // Match: 1 !== 0
        const resultMatch = service.evaluate(rules, [{ player: 'Player F', metric: 'blocks', value: 1 }]);
        expect(resultMatch.totalScore).toBe(5);

        // No match: 0 === 0
        const resultNoMatch = service.evaluate(rules, [{ player: 'Player F', metric: 'blocks', value: 0 }]);
        expect(resultNoMatch.totalScore).toBe(0);
    });

    it('handles multiple rules and combines scores correctly', () => {
        const rules: ScoringRule[] = [
            { player: 'Player A', metric: 'points', condition: 'GT', threshold: 10, score: 10 },
            { player: 'Player B', metric: 'rebounds', condition: 'GTE', threshold: 5, score: 20 },
        ];

        const selections: PredictionSelection[] = [
            { player: 'Player A', metric: 'points', value: 12 }, // matches: 12 > 10 (10 points)
            { player: 'Player B', metric: 'rebounds', value: 4 },  // no match: 4 < 5 (0 points)
        ];

        const result = service.evaluate(rules, selections);
        expect(result.totalScore).toBe(10);
    });
});
