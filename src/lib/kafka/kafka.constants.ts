export const KAFKA_TOPICS = {
    predictionSubmitted: 'prediction.submitted',
    resultRecorded: 'result.recorded',
    scoreComputed: 'score.computed',
    leaderboardUpdated: 'leaderboard.updated',
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];

export interface PredictionSubmittedEvent {
    id: string;
    eventId: string;
    groupId: string;
    userId: string;
    selections: Record<string, any>[];
    submittedAt: Date;
}

export interface ResultRecordedEvent {
    id: string;
    eventId: string;
    payload: Record<string, any>;
    recordedById: string;
    recordedAt: Date;
}

export interface ScoreComputedEvent {
    eventId: string;
    groupId: string;
    userId: string;
    predictionId: string;
    score: number;
    computedAt: Date;
}

export interface LeaderboardUpdatedEvent {
    groupId: string;
    rankings: Record<string, any>[];
    computedAt: Date;
}
