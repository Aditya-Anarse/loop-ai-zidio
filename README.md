# LOOP — AI Customer Feedback Intelligence Platform

LOOP is a premium enterprise SaaS platform built to analyze, categorize, and synthesize customer feedback telemetry in real-time. By leveraging Next.js 14 App Router, NextAuth (Auth.js), Neon PostgreSQL (via Prisma ORM), and Google's Gemini API, LOOP isolates multi-tenant feedback and executes grounded AI operations (auto-classification, theme clustering, RAG-based query responses, and Voice-of-Customer report generation).

---

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Folder Structure](#folder-structure)
3. [Database Design](#database-design)
4. [Authentication & RBAC](#authentication--rbac)
5. [Workspace Isolation](#workspace-isolation)
6. [AI Intelligence Architecture](#ai-intelligence-architecture)
7. [API Endpoint Documentation](#api-endpoint-documentation)
8. [Deployment Guide & Environment Variables](#deployment-guide--environment-variables)
9. [Performance & Deduplication Optimization](#performance--deduplication-optimization)
10. [Error Handling & API Resilience](#error-handling--api-resilience)
11. [Testing & Verification Specifications](#testing--verification-specifications)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Security Overview](#security-overview)
14. [Known Limitations & Future Scope](#known-limitations--future-scope)

---

## Project Architecture

LOOP is designed with a layered architecture enforcing clean boundaries, type safety, and workspace isolation. Below is the system flow map from client requests to third-party endpoints:

```mermaid
graph TD
    Browser["Client Browser (Web UI)"] -->|HTTP Request / Session Cookies| NextJS["Next.js 14 App Router"]
    NextJS -->|Middleware Session Check| API["API Routes (app/api/*)"]
    API -->|Input Validation (Zod)| Services["Services Layer (DbService / AiService)"]
    Services -->|Data Layer Operations| Prisma["Prisma ORM Client"]
    Prisma -->|SQL Transactions| PostgreSQL["PostgreSQL (Neon)"]
    Services -->|AI Telemetry Queries| Gemini["Google Gemini API"]
```

---

## Folder Structure

The LOOP repository is structured as a standard Next.js 14 application:

```
├── app/                      # Next.js 14 App Router Routes
│   ├── (app)/                # Authenticated application workspace routes
│   │   ├── app/              # Main workspace pages (inbox, sentiment, reports)
│   │   └── layout.tsx        # Dynamic layout with authentication shield
│   ├── (auth)/               # Unauthenticated login and registration forms
│   ├── api/                  # Server-side API endpoints
│   │   ├── auth/             # NextAuth routing and registration endpoints
│   │   ├── feedback/         # Feedback querying, classification, triage, Q&A APIs
│   │   └── reports/          # Voice of Customer digest APIs
│   ├── error.tsx             # Global 500 error boundary page
│   ├── forbidden/            # Static 403 Forbidden screen
│   ├── loading.tsx           # Global skeleton loader page
│   ├── not-found.tsx         # Static 404 Not Found screen
│   └── page.tsx              # Root index session redirector
├── components/               # Reusable UI component modules
│   ├── dashboard/            # Stats metrics and Recharts visualization charts
│   ├── feedback/             # Input forms, data tables, and search components
│   ├── layout/               # Navbars, sidebars, and structural frameworks
│   └── ui/                   # Basic layout components (buttons, inputs, toasts)
├── features/                 # Modular domain features
│   └── auth/                 # Shared login and register forms
├── lib/                      # Core configurations and databases
│   ├── auth/                 # NextAuth credentials settings & role controls
│   ├── services/             # Core service layers (ai-service, db-service)
│   ├── prisma.ts             # Prisma Client instance pool caching
│   └── validation.ts         # Zod schemas for input validation
├── prisma/                   # Database schemas and seed configurations
│   ├── migrations/           # Database migration logs
│   ├── schema.prisma         # Prisma data models
│   └── seed.ts               # Database seed scripts
└── services/                 # Helper utilities and authorization controllers
```

---

## Database Design

LOOP uses Neon serverless PostgreSQL, mapped via Prisma ORM.

```mermaid
erDiagram
    Workspace ||--o{ User : "has"
    Workspace ||--o{ Feedback : "contains"
    Workspace ||--o{ Theme : "defines"
    Workspace ||--o{ Report : "compiles"
    Feedback ||--o{ FeedbackTheme : "mapped"
    Theme ||--o{ FeedbackTheme : "mapped"

    Workspace {
        uuid id PK
        varchar name
        varchar slug UNIQUE
        timestamp createdAt
        timestamp updatedAt
    }

    User {
        uuid id PK
        uuid workspaceId FK
        varchar email UNIQUE
        varchar password
        varchar fullName
        WorkspaceRole role
        timestamp createdAt
    }

    Feedback {
        uuid id PK
        uuid workspaceId FK
        string content
        FeedbackSource source
        Sentiment sentiment
        json metadata
        timestamp submittedAt
    }

    Theme {
        uuid id PK
        uuid workspaceId FK
        varchar name
        string description
        timestamp createdAt
    }

    FeedbackTheme {
        uuid feedbackId PK, FK
        uuid themeId PK, FK
    }

    Report {
        uuid id PK
        uuid workspaceId FK
        varchar title
        ReportStatus status
        json content
        timestamp generatedAt
    }
```

---

## Authentication & RBAC

LOOP implements NextAuth (Auth.js) using JWT-based credentials persistence. Users are bound to a single Workspace (Tenant Isolation). Actions are restricted by Role Validation:

| Role | Reading Inbox Data | Editing & Status Changes | CSV Ingestion & Bulk Imports | Run AI Triage (Queue) | Report Generation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **ANALYST** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **VIEWER** | ✅ Allowed | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |

If a `VIEWER` attempts to send a mutation (e.g. `POST` or `PUT` action), server-side authorization blocks the request and returns an HTTP `403 Forbidden` JSON response.

---

## Workspace Isolation

Workspace isolation is strictly enforced at the query level:
1. When a user authenticates, their `workspaceId` is encoded into the signed NextAuth JWT.
2. In API routes, the `workspaceId` is retrieved directly from the validated session.
3. All Prisma queries filter database operations using this extracted `workspaceId`. Under no circumstances can a user query or manipulate data belonging to another workspace key.

---

## AI Intelligence Architecture

AI operations are divided into four primary tasks powered by **Google Gemini API**:
1. **AI1: Feedback Auto-Classification**: Analyzes raw feedback on ingestion or triage queue execution using `gemini-2.5-flash` to retrieve sentiment, happiness score, priority rating, theme, application area, and a concise summary.
2. **AI2: Theme Clustering**: Groups unorganized feedback items in bulk into distinct, named themes (up to 5) using `gemini-2.5-flash` to identify core product pain points.
3. **AI3: Ask LOOP (RAG)**: A grounded Q&A engine that searches feedback strictly within the tenant's workspace boundary. It uses `gemini-2.5-flash` to answer queries referencing customer names and emails as citations, and returns a strict "data insufficient" message if evidence is missing.
4. **AI4: Voice of Customer Reports**: Compiles workspace stats, user quotes, and negative themes using `gemini-2.5-flash` into a 9-section Markdown executive digest.

---

## API Endpoint Documentation

### 1. `GET /api/feedback`
- **Purpose**: Query paginated, filtered, and sorted feedback.
- **Authentication**: NextAuth session cookie (JWT).
- **Parameters**: `search`, `sentiment`, `source`, `status`, `dateRange`, `tag`, `page`, `pageSize`, `sortField`, `sortOrder`.
- **Response**: Returns items list, pagination variables, and `unclassifiedCount`.

### 2. `PUT /api/feedback`
- **Purpose**: Update feedback details or status parameters.
- **Authentication**: NextAuth session (JWT).
- **Roles**: `ADMIN` or `ANALYST`.

### 3. `POST /api/feedback`
- **Purpose**: Bulk CSV upload. Max 500 rows. Zod validations ensure input integrity.

### 4. `POST /api/feedback/triage`
- **Purpose**: Trigger batch AI classification (triages unclassified queues in batches of 5).
- **Authentication**: NextAuth session.
- **Roles**: `ADMIN` or `ANALYST`.
- **Response**:
  ```json
  {
    "success": true,
    "message": "AI Triage batch processing completed.",
    "data": {
      "processed": 5,
      "remaining": 12
    },
    "errors": []
  }
  ```

### 5. `POST /api/feedback/classify`
- **Purpose**: Run auto-classification on a custom feedback input.
- **Authentication**: NextAuth session.
- **Roles**: `ADMIN` or `ANALYST`.

### 6. `POST /api/feedback/cluster`
- **Purpose**: Identify top 5 driving complaint themes dynamically.
- **Authentication**: NextAuth session.

### 7. `POST /api/feedback/qa`
- **Purpose**: Ask questions about customer feedback (RAG).
- **Response**: Grounded answers using strictly verified database citations.

### 8. `POST /api/reports/voc`
- **Purpose**: Synthesize overall customer feedback trends into markdown reports.
- **Roles**: `ADMIN` or `ANALYST`.

---

## Deployment Guide & Environment Variables

### Environment Variables
Configure the following parameters in a `.env` file at the root level. Do not prefix server-only keys with `NEXT_PUBLIC_` to prevent exposure.

```ini
# Database Connection
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"

# NextAuth Settings
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Configuration
GEMINI_API_KEY="AIzaSy..."
```

### Steps to Deploy on Vercel
1. Create a new project on the Vercel dashboard and connect your repository.
2. In the project settings, add the environment variables listed above.
3. Configure the build settings to default values. Vercel automatically runs `npm run build` which triggers the `postinstall` script to generate the Prisma client (`prisma generate`), ensuring typescript definitions are available.
4. Run database migrations to prepare your production database:
   ```bash
   npx prisma migrate deploy
   ```

---

## Performance & Deduplication Optimization

- **Classification Deduplication**: Before invoking the Gemini API, LOOP searches the database for identical feedback content. If found, it copies the classification results, bypassing the external API call to save resources.
- **Dynamic Imports**: Large client-side visualization libraries (like Recharts) are lazy-loaded via `next/dynamic` with `{ ssr: false }` to speed up initial page renders.
- **Query Pagination**: Database lookups enforce server-side pagination with indexes on `workspaceId`, reducing database load.

---

## Error Handling & API Resilience

- **Exponential Backoff**: AI operations are wrapped in a retry handler with exponential delays (`1000ms` → `2000ms` → `4000ms`), with fallback values used if all retries fail.
- **Consistent Response Schema**: All API controllers use unified response formats, catching database or API failures and returning proper JSON representations.

---

## Testing & Verification Specifications

Verify major workflows using this checklist:
1. **Verification of AI Classification**: Submitting feedback matches correct application areas and priorities.
2. **Queue Verification**: Large CSV uploads are staged in the triage queue as `QUEUED`. Clicking triage runs batch classifications sequentially.
3. **RAG Grounding**: Asking questions unrelated to database records returns the required insufficient data message instead of hallucinating.

---

## Troubleshooting Guide

- **Prisma Schema Drift**: Run `npx prisma db pull` and `npx prisma generate` to sync local code.
- **Database Connection Terminations**: Verify database connection parameters and SSL requirements.
- **Gemini API rate-limits**: Checked logs should show successful retries via the exponential backoff helper.

---

## Security Overview

1. **Authentication Interception**: Middleware guards `/app/*` routes and redirects unauthenticated users to `/login`.
2. **Input Sanitation**: Zod schemas validate length, types, and email formats.
3. **Database Parameterization**: Prisma parameterizes query parameters, mitigating SQL Injection threats.

---

## Known Limitations & Future Scope

1. **Upload Limits**: CSV bulk uploads are limited to `500` records to avoid client-side file parsing timeouts.
2. **Hybrid Search Integration**: Future upgrades will replace SQL keyword lookups with vector search (`pgvector`).
