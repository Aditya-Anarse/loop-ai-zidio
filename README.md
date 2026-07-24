# LOOP — AI Customer Feedback Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2_App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-6.12-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![NextAuth](https://img.shields.io/badge/Auth.js-NextAuth_v4-5A29E4?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://next-auth.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **LOOP** is an enterprise-grade, multi-tenant AI customer feedback intelligence platform designed to centralize feedback streams, perform automated sentiment and theme classification, power grounded RAG conversations, and generate actionable Voice-of-Customer (VoC) executive summaries.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [1. Authentication & Multi-Tenant Workspaces](#1-authentication--multi-tenant-workspaces)
  - [2. Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
  - [3. Feedback Management & Workflow](#3-feedback-management--workflow)
  - [4. AI Intelligence Features](#4-ai-intelligence-features)
  - [5. Advanced Integrations Module](#5-advanced-integrations-module)
- [System Architecture](#-system-architecture)
  - [Layer Breakdown](#layer-breakdown)
  - [AI Flow Pipeline](#ai-flow-pipeline)
- [Database Schema & Models](#-database-schema--models)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Installation Guide](#-installation-guide)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Production Deployment (Vercel)](#-production-deployment-vercel)
- [Security Architecture](#-security-architecture)
- [Screenshots & Visual Interface](#-screenshots--visual-interface)
- [Demo Credentials](#-demo-credentials)
- [Roadmap & Future Scope](#-roadmap--future-scope)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Modern product and customer success teams receive thousands of unstructured feedback items monthly from channels like customer support tickets, surveys, product reviews, and manual submissions.

**LOOP** turns raw feedback data into actionable product intelligence. By combining Next.js 14 App Router, PostgreSQL (Neon serverless), Prisma ORM, and advanced LLM architectures (Google Gemini / Claude compatible), LOOP enables organizations to automatically extract customer sentiment, isolate emerging feature themes, query customer feedback using Retrieval-Augmented Generation (RAG), and dispatch automated webhooks and integration events to Slack, Jira, and Zendesk.

---

## ⚡ Key Features

### 1. Authentication & Multi-Tenant Workspaces
- **Multi-Tenant Architecture**: Complete data boundary isolation per workspace via workspace UUID scoping across every query.
- **Secure Authentication**: NextAuth.js JWT-based session handling with encrypted passwords (Bcrypt).
- **Workspace Creation**: Onboarding flow allowing users to register, create, or join targeted organizational workspaces.
- **Session Protection**: Middleware route protection for all app screens.

---

### 2. Role-Based Access Control (RBAC)

LOOP enforces a strict permission model to ensure fine-grained data governance across organization members:

| Capability / Action | ADMIN | ANALYST | VIEWER |
| :--- | :---: | :---: | :---: |
| View Feedback Inbox & Dashboard | ✅ | ✅ | ✅ |
| Run Global Search & Filter Queries | ✅ | ✅ | ✅ |
| Read AI Theme Analytics & VoC Reports | ✅ | ✅ | ✅ |
| Execute Grounded Q&A ("Ask LOOP") | ✅ | ✅ | ✅ |
| Manual Feedback Entry | ✅ | ✅ | ❌ |
| CSV Bulk Data Import | ✅ | ✅ | ❌ |
| Trigger AI Auto-Classification & Batch Triage | ✅ | ✅ | ❌ |
| Change Feedback Workflow Status (`NEW` → `REVIEWED` → `ACTIONED`) | ✅ | ✅ | ❌ |
| Generate Voice-of-Customer Reports | ✅ | ✅ | ❌ |
| Manage Workspace Integrations & Webhook Endpoints | ✅ | ❌ | ❌ |
| View System Webhook Logs & Integration Audit History | ✅ | ❌ | ❌ |

---

### 3. Feedback Management & Workflow

- **Multi-Channel Ingestion**:
  - **Manual Entry**: Single feedback entry form with customer metadata.
  - **CSV Bulk Upload**: File parser with batch validations (up to 500 records).
  - **Simulated Feedback Channels**: Built-in mock streams representing live surveys and support channels.
- **Feedback Inbox**:
  - Server-side text search across customer names, emails, and feedback content.
  - Multi-parameter filtering by Sentiment (`POSITIVE`, `NEUTRAL`, `NEGATIVE`, `MIXED`), Source, and Status.
  - Server-side pagination with custom page sizes.
- **Status Lifecycle Workflow**:
  ```
  [ NEW ]  ➜  [ REVIEWED ]  ➜  [ ACTIONED ]
  ```
  Tracks feedback through triage and product roadmap resolution.

---

### 4. AI Intelligence Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI INTELLIGENCE ENGINE                          │
├───────────────────┬───────────────────┬───────────────┬────────────────┤
│ Auto-Classify     │ Theme Analysis    │ Ask LOOP      │ VoC Reports    │
│ • Sentiment Score │ • Trend Clustering│ • Grounded    │ • Digest Synthesis│
│ • Feature Areas   │ • Emerging Issues │   RAG Engine  │ • Pain Points  │
└───────────────────┴───────────────────┴───────────────┴────────────────┘
```

#### 🔮 AI Auto-Classification
- **Sentiment Detection**: Classifies feedback as `POSITIVE`, `NEUTRAL`, `NEGATIVE`, or `MIXED` with exact numerical scores.
- **Theme Extraction**: Extracts key themes and tags directly from customer text.
- **Feature Area Mapping**: Categorizes issues into application components (e.g., Billing, Performance, UI/UX, Security).

#### 📊 Theme Analysis & Clustering
- Group feedback items dynamically to surface overarching pain points.
- Identify growing trends and spike detectors for newly introduced bugs or feature requests.

#### 💬 Ask LOOP (Retrieval-Augmented Generation / RAG)
- **Grounded Q&A Engine**: Query customer feedback in natural language.
- **Tenant-Scoped Search**: Searches strictly within the authenticated workspace's vector embeddings and relational records.
- **Cited Responses**: Returns grounded answers accompanied by exact supporting customer feedback citations (with names, emails, and timestamps).

#### 📑 Voice-of-Customer (VoC) Executive Reports
- Generates comprehensive Markdown insight summaries.
- Highlights key customer pain points, top requesting customer accounts, and suggested action items for product managers.

---

### 5. Advanced Integrations Module

LOOP includes an enterprise integration dispatcher supporting outward event delivery to third-party SaaS systems:

```
[ Feedback Event ] ──► [ Idempotency Layer ] ──► [ Integration Event Queue ]
                                                           │
        ┌──────────────────┬──────────────────┬────────────┴─────┐
        ▼                  ▼                  ▼                  ▼
  [ Webhook ]        [ Slack ]         [ Zendesk ]           [ Jira ]
  HMAC Signed      Incoming Hook      Ticket Dispatch     Issue Creator
```

- **Supported Provider Architectures**:
  - **Webhook Dispatch**: Custom HTTP POST endpoints with configurable headers.
  - **Slack Integration**: Real-time notifications for high-priority or negative feedback.
  - **Jira Integration**: Automated issue/bug creation for actioned customer feedback.
  - **Zendesk Integration**: Support ticket sync and context sharing.
- **Security & Reliability Infrastructure**:
  - 🔐 **AES-256-GCM Credential Encryption**: Integration tokens and webhook secrets are encrypted at rest using AES-256-GCM with SHA-256 key derivation.
  - 🔏 **HMAC Payload Signing**: Webhooks include standard `x-loop-signature` (`t=<timestamp>,v1=<hash>`) headers to ensure payload authenticity.
  - 🔄 **Exponential Backoff & Retries**: Automated retry mechanism for failed deliveries (`1s` → `2s` → `4s`) up to max attempt threshold (`DEAD_LETTER` queue).
  - ⚡ **Idempotency Handling**: Unique idempotency keys prevent duplicate webhook dispatching within time windows.
  - 📜 **Audit & Delivery Logs**: Full workspace visibility into dispatch attempts, HTTP status responses, payload previews, and integration config change audit trails.
  - ☁️ **Serverless Processing**: Asynchronous, non-blocking execution optimized for serverless edge deployments.

---

## 🏗️ System Architecture

### Layer Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION LAYER                     │
│               React 18  │  Next.js 14 App Router  │  Tailwind CSS          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Session JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                           API GATEWAY / ROUTE HANDLERS                 │
│         Next.js Route Handlers (app/api/*)  │  Zod Schema Validation      │
│                  NextAuth Authentication  │  RBAC Authorization        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Processed & Validated DTOs
┌───────────────────────────────────▼────────────────────────────────────┐
│                             SERVICE LAYER                              │
│   ┌────────────────────┬────────────────────┬──────────────────────┐   │
│   │ AiService          │ WebhookService     │ IntegrationService   │   │
│   │ (Gemini / RAG)     │ (Idempotency Queue)│ (AES-256 & Providers)│   │
│   └────────────────────┴────────────────────┴──────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma Client ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                           DATABASE & STORAGE LAYER                     │
│                  PostgreSQL (Neon)  │  Vector Embeddings               │
└────────────────────────────────────────────────────────────────────────┘
```

### AI Flow Pipeline

```
Raw Customer Feedback Input
         │
         ▼
[ AI Auto-Classification ] ──► (Sentiment, Priority, Category)
         │
         ▼
[ Theme Detection Engine ] ──► (Cluster Identification & Trend Analysis)
         │
         ▼
[ Embedding Generation ]  ──► (Vector Vectorization)
         │
         ▼
[ RAG Vector Search ]     ──► (Workspace Semantic Context Retrieval)
         │
         ▼
[ Grounded AI Response ]   ──► (Synthesized Answer + Customer Citations)
```

---

## 🗄️ Database Schema & Models

LOOP uses Neon Serverless PostgreSQL mapped via Prisma ORM. Below is an overview of the core database entities:

| Model Entity | Description |
| :--- | :--- |
| **`Workspace`** | Top-level tenant container representing an organization. Owns all users, feedback, themes, and reports. |
| **`User`** | System user account attached to a single workspace. Includes hashed password, email, and `WorkspaceRole` (`ADMIN`, `ANALYST`, `VIEWER`). |
| **`Feedback`** | Core customer feedback record containing raw text, customer metadata, `FeedbackSource` (`MANUAL`, `CSV`, `SIMULATED`), and `Sentiment`. |
| **`Theme`** | Identified product topic or feature category defined within a workspace. |
| **`FeedbackTheme`** | Junction entity managing many-to-many relationships between `Feedback` and `Theme` items. |
| **`Embedding`** | Vector embedding store associated with customer feedback for semantic vector retrieval (RAG). |
| **`Report`** | Voice-of-Customer report entity containing generated digest content, status (`DRAFT`, `GENERATING`, `READY`, `FAILED`), and metrics. |
| **`Integration`** | Configuration model storing provider status (`Connected`, `Disconnected`), state, and AES-256 encrypted credential payloads. |
| **`IntegrationEvent`** | Queue entity tracking event idempotency keys, delivery status (`PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`, `DEAD_LETTER`), and retry attempt metadata. |
| **`WebhookLog`** | Real-time delivery telemetry log recording HTTP request/response payloads, latency (`durationMs`), status codes, and error tracebacks. |
| **`IntegrationAuditLog`** | Administrative audit stream recording integration configuration changes, test triggers, user identity, and previous/new state diffs. |

---

## 📁 Project Structure

```
├── app/                        # Next.js 14 App Router Routes
│   ├── (app)/                  # Authenticated Dashboard Application Workspace
│   │   └── app/                # Main Application Views
│   │       ├── analytics/      # AI Analytics & Sentiment Charts
│   │       ├── feedback/       # Feedback Inbox & Search
│   │       ├── integrations/   # Webhook, Slack, Jira & Zendesk Management
│   │       ├── qa/             # Ask LOOP RAG Conversational Interface
│   │       └── reports/        # Voice of Customer Digest Reports
│   ├── (auth)/                 # Unauthenticated Routes (Login, Signup)
│   ├── api/                    # Serverless Next.js API Route Handlers
│   │   ├── auth/               # Registration & NextAuth API Handlers
│   │   ├── feedback/           # Feedback Operations & AI Classification
│   │   ├── integrations/       # Integration Management & Webhook Dispatches
│   │   └── reports/            # VoC Report Generation APIs
│   ├── error.tsx               # Global 500 Error Boundary
│   ├── forbidden/              # 403 Forbidden Access Page
│   └── page.tsx                # Session Gateway Redirector
├── components/                 # React UI Components
│   ├── dashboard/              # Stat Cards & Recharts Visualizations
│   ├── feedback/               # Inbox Tables, Filters & Manual Forms
│   ├── integrations/           # Integration Cards & Webhook Telemetry Logs
│   ├── layout/                 # Sidebar Navigation & Workspace Headers
│   └── ui/                     # Design System Primitive Components
├── lib/                        # Core Shared Utilities & Services
│   ├── auth/                   # NextAuth Config & Authorization Utilities
│   ├── prisma.ts               # Global Prisma Client Instance Caching
│   ├── security/               # AES-256-GCM Encryption & HMAC Signer
│   ├── services/               # Service Layer (AiService, WebhookService, IntegrationService)
│   └── validation.ts           # Zod Input Sanitation Schemas
├── prisma/                     # Database Configuration
│   ├── schema.prisma           # Prisma Data Schema & Indexes
│   └── seed.ts                 # Database Seeding Script
└── public/                     # Static Assets & Icons
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory of your workspace. Refer to the table below for configuration specifics:

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Neon serverless supported). | `postgresql://user:pass@ep-cool-name.neon.tech/loopdb?sslmode=require` |
| `NEXTAUTH_SECRET` | **Yes** | High-entropy random string used to encrypt JWT sessions and derive AES-256 keys. | `e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0` |
| `NEXTAUTH_URL` | **Yes** | Canonical root URL of the deployed app (**Must match your production domain on Vercel**). | `http://localhost:3000` (Local) / `https://your-app.vercel.app` (Prod) |
| `AI_API_KEY` / `GEMINI_API_KEY` | **Yes** | API key for Gemini / LLM provider to power classification, RAG, and reports. | `AIzaSyD-example-key-string` |

---

## 🛠️ Installation Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Package Manager**: `npm` (v9+) or `pnpm`
- **Database**: PostgreSQL instance (Neon serverless recommended)
- **Git**: Installed on local system

### Step-by-Step Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/loop-ai.git
   cd loop-ai
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your credential values:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database & Prisma Client**:
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push database migrations to PostgreSQL
   npx prisma db push

   # (Optional) Seed initial demo workspace & sample feedback data
   npx prisma db seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 🧪 Testing & Quality Assurance

Maintain software reliability and code quality using the built-in verification tools:

### 1. Static Type Checking
Run TypeScript type safety verification:
```bash
npm run typecheck
```

### 2. Database Schema & Migration Verification
Verify Prisma schema integrity and sync state with your remote database:
```bash
npx prisma validate
npx prisma db pull
```

### 3. Webhook Delivery & Integration Testing
- Navigate to `/app/integrations` in your browser.
- Select any configured provider (Webhook, Slack, Jira, or Zendesk).
- Click **Test Connection** to dispatch an automated `TEST_EVENT`.
- Inspect the **Webhook Telemetry Logs** table to confirm delivery status code `200 OK` and inspect duration latency.

### 4. AI Engine Verification
- Submit sample feedback item via `/app/feedback`.
- Verify auto-assigned sentiment and theme tags.
- Navigate to `/app/qa` and execute a query to verify grounded RAG context retrieval.

---

## 🚀 Production Deployment (Vercel)

LOOP is optimized for seamless zero-downtime deployment on Vercel.

### Deployment Steps:

1. **Push Code to GitHub**:
   Ensure your latest code changes are pushed to your remote repository.

2. **Import Project to Vercel**:
   - Go to your Vercel Dashboard.
   - Click **Add New Project** and select your GitHub repository.

3. **Configure Environment Variables**:
   In the Vercel project configuration screen, navigate to **Environment Variables** and add:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (Set to your Vercel deployment URL, e.g., `https://loop-ai.vercel.app`)
   - `AI_API_KEY` (or `GEMINI_API_KEY`)

4. **Build Settings**:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (Automatically triggers `prisma generate` via `postinstall` script)

5. **Execute Remote Database Migration**:
   Run database migrations against your production Neon PostgreSQL database:
   ```bash
   npx prisma migrate deploy
   ```

---

## 🔒 Security Architecture

- **Workspace Data Isolation**: Every Prisma database read/write operation is explicitly filtered using the authenticated user's `workspaceId` extracted from cryptographically signed NextAuth JWTs.
- **Server-Side API Route Protection**: All API endpoints perform authorization validation via server-side session checks and Zod input validation schemas.
- **Role Authorization Enforcer**: Mutation routes (`POST`, `PUT`, `DELETE`) inspect user roles (`ADMIN`, `ANALYST`, `VIEWER`) and respond with `403 Forbidden` if unauthorized.
- **AES-256-GCM Credential Encryption**: Sensitive third-party tokens (Slack webhooks, Jira tokens, Zendesk secrets) are encrypted before persisting to PostgreSQL.
- **No Exposed API Keys**: AI provider keys and database secrets are strictly accessed in server-side Next.js Route Handlers and never leaked to client bundles.

---

## 📸 Screenshots & Visual Interface

> *Visual preview placeholders of the LOOP intelligence application UI:*

### Main Analytics Dashboard
![Dashboard Placeholder](https://via.placeholder.com/1200x675.png?text=LOOP+Analytics+Dashboard+Preview)

### Feedback Inbox & Filtering Interface
![Feedback Inbox Placeholder](https://via.placeholder.com/1200x675.png?text=LOOP+Feedback+Inbox+Preview)

### AI Theme Analytics & Sentiment Intelligence
![AI Analytics Placeholder](https://via.placeholder.com/1200x675.png?text=LOOP+AI+Theme+Analytics+Preview)

### Integrations & Webhook Telemetry Center
![Integrations Placeholder](https://via.placeholder.com/1200x675.png?text=LOOP+Integrations+%26+Webhook+Logs+Preview)

---

## 🔑 Demo Credentials

To test the platform across different role permissions, run `npx prisma db seed` and log in using the following accounts:

### 👑 Administrator Role
- **Email**: `admin@loopai.com`
- **Password**: `AdminPassword123!`
- *Access: Full administrative control, user management, workspace settings, integrations.*

### 📈 Analyst Role
- **Email**: `analyst@loopai.com`
- **Password**: `AnalystPassword123!`
- *Access: Read/write access to feedback, AI triage, CSV imports, VoC reports. Cannot modify integration secrets.*

### 👁️ Viewer Role
- **Email**: `viewer@loopai.com`
- **Password**: `ViewerPassword123!`
- *Access: Read-only access to feedback inbox, dashboards, and AI Q&A. Mutation routes restricted.*

---

## 🔮 Roadmap & Future Scope

- [ ] **Native Vector Database Integration**: Upgrade keyword & embedding hybrid search to `pgvector` native indices.
- [ ] **Multi-Model Provider Support**: Hot-swappable AI providers including OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and local Ollama endpoints.
- [ ] **Automated Workflow Rules Engine**: Custom trigger-action builder (e.g., *If sentiment is NEGATIVE and priority is HIGH ➜ automatically create Jira ticket*).
- [ ] **Advanced Customer Cohort Analytics**: Deep filtering by customer ARR, tier, and lifetime value (LTV).
- [ ] **Bidirectional CRM Sync**: Two-way synchronization with Salesforce and HubSpot.

---

## 🤝 Contributing

We welcome contributions from the developer community! To contribute:

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```
3. **Commit your Changes**:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/amazing-new-feature
   ```
5. **Open a Pull Request**: Submit your PR for review with detailed release notes.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ for Product and Customer Experience Teams worldwide.</sub>
</p>
