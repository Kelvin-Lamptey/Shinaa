# Shinaa 🗝️🗓️

**Shinaa** is a lightweight, open-source key logging and class scheduling prediction system tailored for university campus environments. It solves operational bottlenecks for caretakers logging physical keys and provides students with vacancy predictions based on class schedules.

---

## 🛠️ Federated Architecture Model

Shinaa operates on a **federated architecture** designed to balance local ownership of university data with a unified, friction-free mobile experience for end-users:

1. **Self-Hosted School Backends**: Each participating university hosts its own deployment of the Shinaa REST API and database. This ensures that student information, key logs, and classroom timetables remain secure and locally governed by the institution's IT department.
2. **Universal Mobile Client**: Instead of compiling different applications for different campuses, a single universal mobile app binary is shared. 
3. **Federated Discovery Protocol**: On initial launch, the mobile app connects to a global, production-ready school registry. Tapping a listed university dynamically reconfigures the mobile app's active API client routing configuration to point directly to that school's self-hosted instance using secure local storage.

```text
                                 [ Universal Mobile App ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             (Initial App Launch)                        (Selected University)
                       │                                           │
         [ Global Discovery Directory ]                            │
  https://.../public/directory.json                                │
                       │                                           │
                       ▼                                           ▼
          [ Campus List Catalog ]                       [ Self-Hosted Campus API ]
   (GCTU, University of Ghana, etc.)                   e.g., https://api.gctu.edu.gh
                                                                   │
                                                                   ▼
                                                       [ Campus PostgreSQL DB ]
```

---

## ⚡ 3-Minute Developer Setup Guide

Get a fully functioning local developer environment running in under three minutes using Docker and Bun.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Docker & Docker Compose](https://www.docker.com/)

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env` in the project root directory:
```bash
cp .env.example .env
```
*(The default credentials and database URLs are pre-configured to work out of the box with the local Docker Compose PostgreSQL database).*

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

## 🌐 Federated Onboarding Guide (Add Your School)

If you are a university IT department, computer science club, or student developer looking to deploy Shinaa for your campus, follow these steps to list your school globally:

### Step 1: Deploy Your Infrastructure
Self-host the Shinaa REST API (`apps/api`) and PostgreSQL database. Note your public backend API endpoint (e.g., `https://shinaa-api.yourcampus.edu`).

### Step 2: Define Your Directory Payload
Construct a JSON listing object for your university using the schema detailed below:

```json
{
  "id": "unique-school-slug",
  "name": "Full University Name",
  "aliases": ["ABBR", "Alias Name"],
  "server_url": "https://shinaa-api.yourcampus.edu"
}
```

#### Directory Parameters:
* `id` *(string, required)*: A unique slug containing lowercase letters and hyphens (e.g., `gctu` or `univ-ghana`).
* `name` *(string, required)*: The official display name of your school (e.g., `Ghana Communication Technology University`).
* `aliases` *(array of strings, required)*: Commonly searched abbreviations or aliases to optimize user query filtering (e.g., `["GCTU", "GTUC"]`).
* `server_url` *(string, required)*: The fully qualified URL pointing to your self-hosted backend API.

### Step 3: Open a Pull Request
1. Fork this repository.
2. Edit [apps/web-dashboard/public/directory.json](file:///c:/Users/kelvi/Documents/Code/A/Shinaa/apps/web-dashboard/public/directory.json) and add your JSON object to the catalog array.
3. Open a Pull Request (PR) against the `main` branch.
4. Once your PR is reviewed and merged, the changes are automatically built and published to our global GitHub Pages directory feed. The universal mobile client will display your school next time users open the Campus Discovery screen.

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
