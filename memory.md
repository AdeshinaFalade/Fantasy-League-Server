# Memory — Database Connectivity and Setup

Last updated: 2026-06-28T23:49:00+01:00

## What was built

- Modified [kafka.service.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/lib/kafka/kafka.service.ts) to check the `KAFKA_ENABLED` environment variable and avoid broker connection attempts when set to `false`.
- Modified [seed.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/prisma/seed.ts) to initialize `PrismaClient` with the `@prisma/adapter-pg` driver adapter.
- Added `@ApiBearerAuth()` decorators to all protected NestJS controllers and routes in the workspace (including [groups.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/groups/groups.controller.ts), [events.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/events/events.controller.ts), [rules.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/rules/rules.controller.ts), [predictions.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/predictions/predictions.controller.ts), [leaderboard.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/leaderboard/leaderboard.controller.ts), and [auth.controller.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/auth/auth.controller.ts)).
- Configured the `bearer()` plugin in Better Auth [auth.factory.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/lib/auth/auth.factory.ts) so that the backend can parse and validate Bearer tokens passed via the `Authorization` header.

## Decisions made

- Retained Prisma v7 configuration standards. Since Prisma v7 deprecates the `url` property in `schema.prisma` files, we initialize all `PrismaClient` instances using `@prisma/adapter-pg` driven by `DATABASE_URL` dynamically.
- Disabled Kafka client connections during local development when `KAFKA_ENABLED=false` is configured in `.env` to prevent the logs from being flooded with broker connection errors.

## Problems solved

- **Prisma Client Initialization Error in Seed Script:** Resolved the initialization failure in `prisma/seed.ts` because it attempted to initialize `new PrismaClient()` without an adapter, which is forbidden in Prisma v7 when the schema contains no static connection URL.
- **Kafka connection errors:** Fixed application startup logs pollution caused by Kafka trying to connect to a non-existent local broker even when disabled.
- **Port 3000 EADDRINUSE Conflict:** Successfully freed TCP port 3000 by terminating a ghost process/server instance that was already binding to it, restoring the ability of the development server to start.
- **Swagger Authorization Header (Unauthorized in UI):** Added `@ApiBearerAuth()` decorators to all authenticated routes. Without these decorators, Swagger UI does not attach the `Authorization` header to requests even when the user enters the token in the Swagger UI Authorize box, causing routes to return a 401 Unauthorized error.
- **Better Auth Bearer Token Validation:** Integrated the `bearer()` plugin from `better-auth/plugins` in the backend. By default, Better Auth only processes session cookies. Adding the `bearer()` plugin enables the server to recognize and authenticate incoming Bearer tokens from Swagger / client requests.

## Current state

- NestJS server starts up and runs correctly, successfully mapping all routes.
- Database connectivity has been successfully verified via the prisma seed script which runs to completion against the remote Prisma Postgres database on `db.prisma.io`.
- Swagger document definition now correctly maps security settings to protected endpoints.
- The authentication system is now fully configured to accept and validate Bearer tokens from request headers.

## Next session starts with

- Implementation of NestJS feature controllers or service endpoints utilizing the connected `PrismaService` instance.

## Open questions

- None. Everything is configured and verified successfully.
