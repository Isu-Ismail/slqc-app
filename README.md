# Quran Competition Management System (SQLC)

A premium, state-of-the-art Web Application suite designed to manage Quran recitation and memorization competitions. The system automates participant registration, institution applications, preliminary & final round venue allocations, dynamic marksheet evaluation with judge assignments, complex tie-breaking leaderboards, and multi-year archiving.

---

## 🌟 Key Features & Problems Solved

### 1. Robust Participant Registration & Verification
- **Dynamic Age Validation**: Age calculation relative to configurable competition criteria (with buffer month tolerances) defined in global metadata settings.
- **Institutional Limits**: Restricts the maximum number of registrations per institution to ensure fair representation across schools.
- **Workflow Approvals**: Two-tier approval process allowing admins to accept/reject registrations and manage student details.

### 2. Preliminary & Final Round Venue Allocation
- **Automated Shuffling**: Distributes participants across multiple stages (Stage A, B, C, etc.) based on capacity limits and categories (e.g., 5 Juz, 15 Juz, 30 Juz).
- **Preconfigured Final Venues**: Admin-defined final round venues with capacity constraints and judge assignments. Finalist allocation randomly shuffles and assigns finalists to their respective stage order.
- **Unallocation Safety**: Reverts allocations without losing custom venue settings, judge assignments, or deleting administrative venue records.

### 3. Dynamic Marksheets & Password-Protected Templates
- **Category Aspect Configuration**: Custom scoring metrics per category (e.g., Memory, Tajweed, etc.) configured dynamically via a Template Editor.
- **Locking Mechanism**: If a single mark is entered for a category, editing or deleting aspects is disabled, preventing accidental template changes.
- **Accidental Edit Prevention**: Requires typing `"I WANT TO EDIT"` in uppercase and validating the admin password to unlock templates when allowed.

### 4. Advanced Leaderboards & Dynamic Tie-Resolution
- **Strict Priority Sorting**: Grades participants using memory scores first, falling back to Tajweed and secondary aspects in order.
- **Resolve Tie Interactive Modal**: For tied scores, admins can dynamically select fallback grading priorities and override choices, resolving conflicts immediately in the UI.

### 5. Multi-Year Archiving & System Resets
- **Transactional Archiving**: Moves all active year records (applicants, marks, templates, judges, and venues) to dedicated `*_archive` tables, stamped with the historical `year`.
- **System Resets**: Safely clears current-year databases for the next competition season while maintaining a historical read-only viewer.
- **Password Verification**: Any archiving or deletion action requires password authorization.

---

## 🏗️ Architecture & Project Structure

The project is structured as a monorepo consisting of the following key directories:

```
├── quran-competition-app/     # React + TypeScript client-facing registration portal
├── admin-dashboard/           # Vite + React + TypeScript Dashboard for admins & judges
├── pocketbase/                # Custom backend config and JavaScript event hooks
│   └── pb_hooks/              # Custom API endpoints (Archive, Allocation, Printing, Marks)
├── seeder/                    # Javascript DB seeding tools for development & testing
├── docker-compose.yml         # Container orchestration configuration
└── nginx.conf                 # Reverse proxy & static assets router
```

### Infrastructure & Deployment Strategy
The system uses a clever **Docker Compose Bridge Volume** trick to make deployment highly portable:
- **`frontend` Container**: Hosts static React frontend apps built into a single image. It acts as a *carrier* for the PocketBase hooks located at `/data/pb_hooks_carrier`.
- **`pocketbase` Container**: Runs a standard, unmodified PocketBase image.
- **Shared Volume (`shared_hooks`)**: On startup, the frontend container deletes old hooks and copies the fresh `.pb.js` hook files into the shared volume, allowing the PocketBase container to automatically load the updated endpoints without rebuilding a custom PocketBase image.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & `pnpm`
- Docker & Docker Compose (for production deployment)

### Local Development

1. **Launch PocketBase & Run Docker Compose**:
   ```bash
   cd pocketbase
   docker compose up -d
   ```

2. **Run the Admin Dashboard**:
   ```bash
   cd admin-dashboard
   pnpm install
   pnpm run dev
   ```

3. **Run the Registration Portal**:
   ```bash
   cd quran-competition-app
   pnpm install
   pnpm run dev
   ```

4. **Seed Mock Data (Optional)**:
   Ensure your PocketBase container is running, then run the seed scripts:
   ```bash
   cd seeder
   node seed_marks.js
   node seed_final_marks.js
   ```

---

## 📄 License
This application is proprietary and built specifically for managing the Quran Competition. All rights reserved.
