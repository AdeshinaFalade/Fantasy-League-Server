import { Module } from '@nestjs/common';
import { ScoringEngineService } from './scoring-engine.service';
import { ScoringConsumer } from './scoring.consumer';

@Module({
    providers: [ScoringEngineService, ScoringConsumer],
    exports: [ScoringEngineService],
})
export class ScoringModule { }
