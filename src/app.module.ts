import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './lib/database/prisma.module';
import { createBetterAuth } from './lib/auth/auth.factory';
import { PrismaService } from './lib/database/prisma.service';
import { KafkaModule } from './lib/kafka/kafka.module';
import { AuthFeatureModule } from './module/auth/auth.module';
import { UsersModule } from './module/users/users.module';
import { GroupsModule } from './module/groups/groups.module';
import { GroupMembersModule } from './module/group-members/group-members.module';
import { EventsModule } from './module/events/events.module';
import { RulesModule } from './module/rules/rules.module';
import { PredictionsModule } from './module/predictions/predictions.module';
import { ResultsModule } from './module/results/results.module';
import { LeaderboardModule } from './module/leaderboard/leaderboard.module';
import { ScoringModule } from './module/scoring/scoring.module';
import { GroupRoleGuard } from './common/guards/group-role.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
    }),
    PrismaModule,
    KafkaModule,
    BetterAuthNestModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prismaService: PrismaService) => ({
        auth: createBetterAuth(prismaService),
        isGlobal: true,
        bodyParser: {
          json: { limit: '2mb' },
          urlencoded: { limit: '2mb', extended: true },
          rawBody: true,
        },
      }),
    }),
    AuthFeatureModule,
    UsersModule,
    GroupsModule,
    GroupMembersModule,
    EventsModule,
    RulesModule,
    PredictionsModule,
    ResultsModule,
    LeaderboardModule,
    ScoringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GroupRoleGuard,
    },
  ],
})
export class AppModule { }
