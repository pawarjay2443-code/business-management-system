# Backend Handoff Document - AI Business Management Platform

This document outlines the architecture, database schema, API structure, security rules, and setup instructions for the backend layer of the AI Business Management Platform.

---

## 1. Database Schema Overview

The database is built on Supabase (PostgreSQL). The SQL schema is defined in [schema.sql](file:///c:/Users/pal04/OneDrive/Desktop/business%20management%20system/schema.sql) and consists of:

### Enums
*   `user_role`: `'Admin'`, `'Manager'`, `'Team Lead'`, `'Employee'`, `'HR'`
*   `project_status`: `'Planned'`, `'In Progress'`, `'Completed'`, `'On Hold'`
*   `task_status`: `'Todo'`, `'In Progress'`, `'In Review'`, `'Done'`
*   `task_priority`: `'Low'`, `'Medium'`, `'High'`, `'Urgent'`
*   `report_type`: `'Financial'`, `'Performance'`, `'Operational'`, `'AI Insight'`
*   `insight_type`: `'Task Bottleneck'`, `'Team Performance'`, `'Financial Forecast'`, `'General'`

### Tables
*   **`profiles`**: User metadata details linked to Supabase Auth (`auth.users`) using a synchronized trigger.
*   **`departments`**: Structural organizational divisions led by a manager.
*   **`teams`**: Teams belonging to departments, managed by a team lead.
*   **`team_members`**: Join table mapping employees to teams.
*   **`projects`**: Projects mapped to departments, supporting milestones JSON structure.
*   **`tasks`**: Project tasks linked to status, priorities, assignees, and reporter records.
*   **`activity_logs`**: System audit trails logging employee actions.
*   **`reports`**: Storage and metadata for company/AI-generated reports.
*   **`performance_metrics`**: Records documenting employee appraisals and KPI metrics.
*   **`ai_insights`**: AI recommendation entries scoped to departments, teams, or projects.

---

## 2. Authentication & Session Management

Supabase Authentication is used to manage user registrations, logins, and session lifecycles:
1.  **Signup**: Handled via `/api/auth/signup`. It creates credentials in `auth.users` and metadata triggers insert a corresponding entry into the public `profiles` table.
2.  **JWT Scoped Access**: Express middleware (`requireAuth`) extracts user tokens, validates session details, and attaches a custom token-scoped client to `req.db`.
3.  **Row Level Security (RLS)**: Because queries are executed via `req.db`, Supabase enforces the database-level security policies defined in `schema.sql` automatically.

---

## 3. RBAC Roles & Permission Middleware

Access to specific endpoints is locked via the `requireRole` middleware array check:
*   **Super Admin** (Maps to `'Admin'`): Bypasses all middleware checks and is allowed full CRUD capabilities.
*   **Business Manager** (Maps to `'Manager'`): Manages teams, projects, tasks, reports, and reviews.
*   **Project Manager / Team Lead** (Maps to `'Team Lead'`): Creates projects/tasks, assigns members, and completes tasks.
*   **HR Manager** (Maps to `'HR'`): Creates departments, profiles, and conducts reviews.
*   **Employee** (Maps to `'Employee'`): View-only permissions for team elements; can update status on assigned tasks.

---

## 4. API Endpoints Reference

All API routes prefix: `/api`

| Route Prefix | Endpoint | Method | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`/auth`** | `/signup` | POST | Public | Registers user and sets role. |
| | `/login` | POST | Public | Validates session. |
| | `/logout` | POST | Authenticated | Clears user session. |
| | `/reset-password`| POST | Public | Request reset email link. |
| | `/update-password`|POST | Authenticated | Update user password. |
| | `/profile` | GET | Authenticated | Fetch current profile info. |
| | `/profile` | PUT | Authenticated | Update profile details. |
| **`/departments`**| `/` | GET | Authenticated | List departments (paginated). |
| | `/:id` | GET | Authenticated | Fetch single department details. |
| | `/` | POST | Admin, HR | Create a department. |
| | `/:id` | PUT | Admin, HR | Update department detail. |
| | `/:id` | DELETE | Admin, HR | Delete department. |
| **`/teams`** | `/` | GET | Authenticated | List all teams. |
| | `/:id` | GET | Authenticated | View team details and members. |
| | `/` | POST | Admin, HR, Manager| Create a team. |
| | `/:id` | PUT | Admin, HR, Manager| Update team. |
| | `/:id` | DELETE | Admin, HR | Delete team. |
| | `/:id/members` | POST | Admin, Manager, Lead | Add member to team. |
| | `/:id/members/:userId`| DELETE | Admin, Manager, Lead | Remove member from team. |
| **`/projects`** | `/` | GET | Authenticated | List projects with filters. |
| | `/:id` | GET | Authenticated | View project with tasks list. |
| | `/` | POST | Admin, Manager, Lead | Create a project. |
| | `/:id` | PUT | Admin, Manager, Lead | Update project details. |
| | `/:id/milestones` | PUT | Admin, Manager, Lead | Manage project milestones. |
| | `/:id` | DELETE | Admin, Manager | Delete project. |
| **`/tasks`** | `/` | GET | Authenticated | List tasks with filters. |
| | `/:id` | GET | Authenticated | View task detail. |
| | `/` | POST | Admin, Manager, Lead | Create a task. |
| | `/:id/assign` | POST | Admin, Manager, Lead | Assign task to user. |
| | `/:id/status` | PUT | Assignee or Lead | Quick status change. |
| | `/:id` | PUT | Assignee or Lead | Update task attributes. |
| | `/:id` | DELETE | Admin, Manager, Lead | Delete a task. |
| **`/reports`** | `/` | GET | Authenticated | List reports. |
| | `/:id` | GET | Authenticated | View report details. |
| | `/:id/export` | GET | Authenticated | Export report (CSV or JSON). |
| | `/` | POST | Admin, HR, Manager| Create a report. |
| | `/:id` | PUT | Admin, HR, Manager| Update report. |
| | `/:id` | DELETE | Admin, HR, Manager| Delete report. |
| **`/activities`** | `/` | GET | Admin, HR | Search and review audit logs. |
| **`/performance`**| `/` | GET | Authenticated | Fetch performance review logs. |
| | `/:id` | GET | Authenticated | Get single metric record. |
| | `/calculate-kpi` | GET | Admin, HR, Manager, Lead | Compute employee task KPIs. |
| | `/productivity-analytics`| GET | Admin, HR, Manager, Lead | Pull company productivity. |
| | `/` | POST | Admin, HR, Manager| Record appraisal score. |
| | `/:id` | PUT | Admin, HR, Manager| Update appraisal details. |
| | `/:id` | DELETE | Admin, HR, Manager| Delete metric record. |
| **`/ai-insights`**| `/` | GET | Authenticated | List AI insights. |
| | `/` | POST | Admin, HR, Manager| Store new AI insight. |
| | `/:id` | DELETE | Admin, HR, Manager| Delete AI insight. |
| **`/dashboard`** | `/stats` | GET | Authenticated | Get dashboard widgets statistics. |

---

## 5. Required Environment Variables

Create a `.env` file in the project root with the following fields:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

---

## 6. Supabase & Server Dependencies

Found in [package.json](file:///c:/Users/pal04/OneDrive/Desktop/business%20management%20system/package.json):
*   `express`: Server routing framework.
*   `@supabase/supabase-js`: Integration client database driver.
*   `cors` & `helmet`: Security middlewares.
*   `dotenv`: Config variable loader.
*   `morgan`: Logging details.

---

## 7. Instructions for the Integration Team

1.  **Set Up Supabase**:
    *   Initialize database by running the [schema.sql](file:///c:/Users/pal04/OneDrive/Desktop/business%20management%20system/schema.sql) file in your Supabase project's SQL editor.
2.  **Configure API Keys**:
    *   Obtain keys from settings inside your Supabase project dashboard and write them into the local `.env` configuration file.
3.  **Install & Run**:
    *   Execute `npm install` to install project dependencies.
    *   Execute `npm run dev` to boot up the API server in hot-reload development mode.
    *   Execute `npm start` for production deployments.
4.  **Confirm Communication**:
    *   Execute a request on `GET http://localhost:5000/health` to confirm the API connection is active.
