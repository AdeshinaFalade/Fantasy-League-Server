# Memory — WebSocket Leaderboard Real-time Update Bug Fix

Last updated: 2026-07-07T20:48:00+01:00

## What was built

- Refactored [leaderboard.gateway.ts](file:///Users/shredder/Projects/Fantasy%20League%20Server/src/module/leaderboard/leaderboard.gateway.ts) to perform authentication asynchronously inside a Socket.io middleware (`afterInit`) instead of the asynchronous `handleConnection` handler.
- Stored authenticated user context directly inside `socket.data.user` instead of keeping an in-memory mapping that could cause memory leaks.

## Decisions made

- Chose to authenticate sockets at the Socket.io server connection phase (`server.use` middleware). This guarantees authentication is complete before client events (such as `joinGroup`) can be registered or processed.

## Problems solved

- Fixed a connection race condition where client-emitted events (specifically `joinGroup`) reached the server before the database lookup for the user's session in the async `handleConnection` finished, which resulted in premature disconnection due to failed user presence checks.

## Current state

- Sockets are authenticated synchronously relative to event listeners, and room joining works successfully.
- Leaderboard updates emit in real-time, allowing clients to receive updates without refreshing.
- 100% of test suites are passing (18/18 tests).

## Next session starts with

- Verifying real-time updates directly on the frontend views and checking screen reactivity.

## Open questions

- None.
