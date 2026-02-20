# Project Brief: Hive

## What Is Hive?

Hive is a **Basecamp-simple**, **AI-native** project management platform. Every user gets a personal AI assistant (PA) that knows their role, projects, work patterns, and preferences. The PA can manage tasks, check calendars, draft emails, generate reports, and proactively surface risks — via natural language (voice or text).

## Core Requirements & Goals

- **5 core modules max:** Organizations & Teams, Projects, Tasks, Messages & Activity Feed, plus the PA engine. No feature bloat; opinionated defaults.
- **AI-native:** The PA is the primary interface; UI is secondary.
- **Async-first:** No real-time presence or typing indicators. Calm communication.
- **Voice-first:** Every action can be performed via voice transcription.
- **Reports as conversations:** No dashboards; users ask questions and get narrative answers.

## Scope (from PRD)

- **Source of truth:** `hive-prd.md` — full product requirements, schema, API reference, and implementation order.
- **Implementation order:** Four phases (Foundation → Voice + PA Core → Integrations + External Actions → Reporting + Proactive). Each phase must be complete and tested before the next.
- **Phase 1 (Foundation):** Next.js + Clerk + Drizzle + PostgreSQL; Organizations, Projects, Tasks, Messages, Activity Log, Notifications; all CRUD and frontend pages working end-to-end.

## Out of Scope (for this brief)

- Separate mobile app; web-first responsive.
- Real-time collaboration (no live cursors, no typing indicators).
- Custom integrations beyond Google, Microsoft, Slack (per PRD).
