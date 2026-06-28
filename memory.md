# Memory — Database Connectivity and Setup

Last updated: 2026-06-29T00:14:00+01:00

## What was built

- Implemented **Users Module** (`GET /users/:id`, `GET /users/search`, `GET /users/me/groups`) in [users.service.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/users/users.service.ts) and [users.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/users/users.controller.ts).
- Implemented **Group Members Module** (`GET /groups/:groupId/members`, `PATCH /groups/:groupId/members/:userId/role`, `DELETE /groups/:groupId/members/:userId`) in [group-members.service.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/group-members/group-members.service.ts) and [group-members.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/group-members/group-members.controller.ts).
- Implemented **Results Module** in [results.service.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/results/results.service.ts) to save stats, transition event status to `SCORING`, and publish a `result.recorded` Kafka event. Exposes a hook for `EventsService.recordResult`.
- Configured **Kafka Event Subscriptions**:
  - Exposes consumer subscription methods directly using `kafkajs` inside [kafka.service.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/lib/kafka/kafka.service.ts).
  - Defined typed payloads for events in [kafka.constants.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/lib/kafka/kafka.constants.ts).
- Implemented **ScoringConsumer** in [scoring.consumer.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/scoring/scoring.consumer.ts) to listen to `result.recorded`, dynamically evaluate actual statistics against rule conditions, save final user scores, and publish `score.computed` events.
- Implemented **LeaderboardConsumer** in [leaderboard.consumer.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/leaderboard/leaderboard.consumer.ts) to listen to `score.computed`, recalculate rankings, persist the leaderboard, and publish `leaderboard.updated`.
- Implemented **GroupRoleGuard** & `@RequireGroupRole` custom decorator under `src/common/` to enforce membership and permission roles (e.g. `ADMIN` vs `PARTICIPANT`) dynamically extracted from the request context and validated against the database.
- Expanded [scoring-engine.service.spec.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/scoring/scoring-engine.service.spec.ts) unit tests to verify evaluations of all operators.
- Implemented complete end-to-end integration flow tests in [scoring-flow.integration.spec.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/scoring/scoring-flow.integration.spec.ts).

## Decisions made

- Extended the custom `KafkaService` to register consumers directly via `kafkajs` instead of `@nestjs/microservices`.
- Registered `GroupRoleGuard` globally in the application providers so it automatically inspects request context routes.
- Evaluated user prediction selections on a true/false basis against dynamically computed rule statuses, enabling robust and scalable event evaluations.
- Dispatched integration test events synchronously to run the entire promise chain synchronously and prevent async race conditions with database teardown.

## Problems solved

- **Complete Backend Implementation**: Turned the initial module shells into a fully functioning, connected event-driven Monolith.
- **Transitive dependency Jest ESM compilation**: Resolved test runner errors by adding `transformIgnorePatterns` to `package.json`'s Jest configuration and mocking `@thallesp/nestjs-better-auth` in unit tests to prevent ESM `import.meta.url` evaluation errors in CommonJS Jest environments.

## Current state

- All modules (Auth, Users, Groups, Group Members, Events, Rules, Predictions, Results, Scoring, Leaderboard, Kafka, Prisma) are fully built and integrated.
- Application builds and compiles successfully.
- Seeding and connection verification scripts run to completion against the Prisma Postgres database.
- **100% of tests are passing successfully (9 out of 9 tests)**.

## Next session starts with

- Building out the frontend components or client SDK.

## Open questions

- None. Implementation is verified and complete.
