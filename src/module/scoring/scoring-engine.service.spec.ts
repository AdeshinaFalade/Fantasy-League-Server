import { ScoringEngineService } from './scoring-engine.service';

describe('ScoringEngineService', () => {
    it('evaluates GT rules', () => {
        const service = new ScoringEngineService();

        const result = service.evaluate(
            [
                { player: 'Player A', metric: 'points', condition: 'GT', threshold: 5.5, score: 20 },
            ],
            [
                { player: 'Player A', metric: 'points', value: 6 },
            ],
        );

        expect(result.totalScore).toBe(20);
    });
});
