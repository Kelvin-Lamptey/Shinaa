# Shinaa 🗝️🗓️

**Shinaa** is a lightweight, open-source key logging and class scheduling prediction system tailored for university campus environments. It solves operational bottlenecks for caretakers logging physical keys and provides students with vacancy predictions based on class schedules.

---

## 🛠️ Tech Stack & Architecture

Shinaa is built as a TypeScript monorepo utilizing **Bun Workspaces**:

* **Runtime:** [Bun](https://bun.sh/)
* **Backend API:** Node.js Express server + TypeScript
* **Database & ORM:** PostgreSQL + Prisma ORM
* **Web Dashboard (Officials/Caretakers):** React.js + Vite + TypeScript + Tailwind CSS (v4)
* **Mobile Client (Caretakers/Students):** React Native (Expo) + TypeScript + Stack Navigation
* **Validation Layer:** Shared Zod validation schemas across workspaces

```text
shinaa/
├── apps/
│   ├── api/                  # Express REST API (listening on port 3000)
│   ├── web-dashboard/        # React Web Dashboard (listening on port 5173)
│   └── mobile-app/           # Expo React Native App (running on port 8081)
├── packages/
│   ├── database/             # Prisma client & PostgreSQL relational configurations
│   └── shared-types/         # Shared Zod schemas & TypeScript typings
```

---

## ⚡ Local Setup Guide

Follow these steps to go from `git clone` to a fully running developer environment in under three minutes.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Docker & Docker Compose](https://www.docker.com/) (for spinning up the local database)

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env` in the project root directory:
```bash
cp .env.example .env
```
*(The default credentials and URLs are pre-configured to work out of the box with the local Docker Compose PostgreSQL database).*

### 3. Spin Up the Database
Start the PostgreSQL container service in the background:
```bash
bun run db:up
```

### 4. Bootstrap and Seed the Database
Install all monorepo dependencies, push the relational schemas to your local PostgreSQL instance, and populate the database with mock records (staff credentials and campus classrooms):
```bash
bun install
bun run db:push
bun run db:seed
```

### 5. Launch the Development Stack
Start the backend server, React web dashboard, and Expo mobile client concurrently with a single command:
```bash
bun run dev
```
- **REST API:** `http://localhost:3000`
- **Web Dashboard:** `http://localhost:5173`
- **Mobile Client:** `http://localhost:8081` (Press `w` to open in browser, `a` for Android emulator, or `i` for iOS simulator)

---

## 🔑 Default Mock Credentials

The database seeding script creates the following accounts for immediate local authentication:

### 1. Official Admin User
- **Email:** `official@shinaa.edu`
- **Password:** `official123`
- **Permitted Actions:** Uploading weekly timetables via CSV and logging single classroom reservations.

### 2. Caretaker User
- **Email:** `caretaker@shinaa.edu`
- **Password:** `caretaker123`
- **Permitted Actions:** Checking out available keys (recording student details) and returning active keys.

---

## 🖥️ Monorepo Orchestration Scripts

Run these commands from the root directory to manage the stack:

| Script Command | Description |
| :--- | :--- |
| `bun run db:up` | Spins up the Docker container holding the PostgreSQL instance. |
| `bun run db:down` | Stops and tears down the PostgreSQL container. |
| `bun run db:push` | Pushes the Prisma relational schema updates directly to the database. |
| `bun run db:seed` | Resets and seeds users, classrooms, and keys into the database. |
| `bun run dev` | Runs backend, web dashboard, and mobile Expo servers in parallel. |

---

## 📄 License
This project is open-source and licensed under the MIT License.
