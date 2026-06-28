import { Injectable } from '@nestjs/common';

export type RuleCondition = 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'NEQ';

export interface ScoringRule {
    player: string;
    metric: string;
    condition: RuleCondition;
    threshold: number;
    score: number;
}

export interface PredictionSelection {
    player: string;
    metric: string;
    value: number;
}

@Injectable()
export class ScoringEngineService {
    evaluate(rules: ScoringRule[], selections: PredictionSelection[]): { totalScore: number; breakdown: unknown[] } {
        let totalScore = 0;
        const breakdown: unknown[] = [];

        for (const rule of rules) {
            const selection = selections.find((candidate) => candidate.player === rule.player && candidate.metric === rule.metric);
            const matched = selection ? this.matches(rule.condition, selection.value, rule.threshold) : false;

            if (matched) {
                totalScore += rule.score;
            }

            breakdown.push({ rule, matched });
        }

        return { totalScore, breakdown };
    }

    private matches(condition: RuleCondition, value: number, threshold: number): boolean {
        switch (condition) {
            case 'GT':
                return value > threshold;
            case 'LT':
                return value < threshold;
            case 'EQ':
                return value === threshold;
            case 'GTE':
                return value >= threshold;
            case 'LTE':
                return value <= threshold;
            case 'NEQ':
                return value !== threshold;
            default:
                return false;
        }
    }
}
