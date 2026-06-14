# Shinaa 🗝️🗓️

**Shinaa** is a lightweight, open-source key logging and class scheduling prediction system tailored for university campus environments. Designed with operational simplicity and high reliability in mind, Shinaa eliminates the complexity of QR codes, hardware scanning, and registration portals in favor of rapid manual entry and predictive vacancy analysis.

## Core Philosophy

1. **Operational Simplicity:** No student portals or complex onboarding. Caretakers log checkout details manually via a fast, keyboard-optimized interface.
2. **Predictive Utility:** Provides a public dashboard for students and representatives to query room availability for any date and time, automatically calculating collisions between recurring timetables and one-time events.
3. **Clean, Scannable UI:** High-contrast layouts, typography-first hierarchy, and micro-interactions optimized for speed.

---

## Architecture & Tech Stack

Shinaa is organized as a monorepo utilizing **Bun Workspaces** for fast package resolution and script execution:

```text
shinaa/
├── apps/
│   ├── api/                  # Node.js/Bun TypeScript REST API (Express or Fastify)
│   ├── web-dashboard/        # React + TypeScript + Tailwind CSS (for Admins & Caretakers)
│   └── mobile-app/           # React Native Expo (for Caretakers & Students)
├── packages/
│   ├── database/             # PostgreSQL database ORM (Prisma or Drizzle)
│   └── shared-types/         # Shared Zod validation schemas
```

### Core Technologies
- **Runtime:** [Bun](https://bun.sh/)
- **Backend:** Express / Fastify (TypeScript)
- **Database ORM:** Prisma / Drizzle with PostgreSQL
- **Frontend:** React + Tailwind CSS + Vite
- **Mobile:** React Native (Expo) + Tailwind (NativeWind)
- **Validation:** Zod (shared across all apps/packages)

---

## Getting Started

Detailed instructions for running Shinaa locally via Docker and seeding development databases will be documented in later phases.

### Prerequisites
- [Bun](https://bun.sh/) (version 1.0 or higher)
- [Docker & Docker Compose](https://www.docker.com/)

---

## License

This project is open-source and licensed under the MIT License.
