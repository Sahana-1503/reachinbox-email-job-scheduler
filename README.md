# ReachInbox Email Job Scheduler

**A Persistent, Queue-Based Email Scheduling and Management Platform**

## 1. Project Overview

ReachInbox Email Job Scheduler is a full-stack application developed as part of the ReachInbox Software Development Engineer (SDE) Intern assignment. The system enables users to schedule emails for future delivery, monitor email processing, and manage scheduled and sent email records through a web-based dashboard.

The application uses a persistent job-processing architecture built with BullMQ and Redis, PostgreSQL for relational data persistence, and Elasticsearch for email search. It incorporates configurable worker concurrency, minimum sending intervals, hourly sending limits, job recovery, and duplicate-processing safeguards.

The application also integrates Google OAuth for authentication, Slack for notifications, Ethereal Email for SMTP testing, and Bull Board for queue monitoring.

## 2. Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Job Queue | BullMQ, Redis |
| Search Engine | Elasticsearch |
| Email Delivery | Nodemailer, Ethereal Email |
| Authentication | Google OAuth, JWT |
| Notifications | Slack OAuth |
| Queue Monitoring | Bull Board |
| Infrastructure | Docker Compose |

## 3. Functional Requirements and Implemented Features

### 3.1 Backend Services

- Schedule emails for specified future dates and times.
- Persist email records in PostgreSQL using Prisma ORM.
- Enqueue scheduled tasks using BullMQ and Redis.
- Configure worker concurrency through environment variables.
- Apply configurable minimum intervals between email sends.
- Enforce hourly email-sending limits using Redis-based coordination.
- Reschedule pending jobs when the hourly limit is reached.
- Preserve the relative order of rescheduled jobs as far as practicable.
- Recover pending scheduling information after backend restarts.
- Use database-state checks and coordination mechanisms to reduce duplicate processing.
- Index email records in Elasticsearch and support search queries.
- Monitor queue activity through Bull Board.
- Send test emails through Ethereal SMTP using Nodemailer.
- Integrate Slack OAuth and hourly-limit notifications.

### 3.2 Frontend Application

- Google OAuth sign-in.
- User profile display.
- Dashboard for email management.
- Separate views for scheduled and sent emails.
- Email detail view.
- Email composition and scheduling.
- CSV and TXT recipient upload.
- Recipient count display.
- Configurable start time, minimum delay, and hourly sending limit.
- Email search functionality.
- Slack connection workflow.
- User logout.

## 4. System Architecture

The application separates user interaction, API processing, persistent storage, background job execution, and search functionality.

```text
                 React Frontend
                       |
                       v
                Express REST API
                       |
          +------------+-------------+
          |            |             |
          v            v             v
     PostgreSQL   Elasticsearch   Authentication
          |                           |
       Prisma                    Google OAuth
          |
          v
      BullMQ Queue
          |
          v
         Redis
          |
          v
      Email Worker
          |
          +------------------+
          |                  |
          v                  v
    Ethereal SMTP      Slack Notification
```

**PostgreSQL** stores relational application data, **Redis** maintains queue state and supports coordination, and **Elasticsearch** provides dedicated email-search capabilities.

## 5. Project Structure

```text
Email Job Scheduler/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── queues/
│       └── workers/
├── frontend/
│   └── src/
├── docker-compose.yml
└── README.md
```

## 6. Prerequisites

Ensure the following software is installed:

- Node.js and npm
- Docker Desktop
- Git

Docker Desktop must be running before starting the local infrastructure services.

## 7. Installation and Configuration

### 7.1 Clone the Repository

```bash
git clone https://github.com/Sahana-1503/reachinbox-email-job-scheduler.git
cd reachinbox-email-job-scheduler
```

### 7.2 Start Infrastructure Services

From the project root, run:

```bash
docker compose up -d
```

Verify the service status:

```bash
docker compose ps
```

PostgreSQL, Redis, and Elasticsearch should be running before the backend is started.

### 7.3 Configure Backend Environment Variables

Create a `.env` file in the `backend` directory.

```env
DATABASE_URL=

REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

PORT=5000
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

JWT_SECRET=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_MS=2000
DEFAULT_HOURLY_LIMIT=100
```

Provide the appropriate database connection string, OAuth credentials, JWT secret, SMTP configuration, and other required values for the local environment. Configure additional variables required by the application as applicable.

Actual credentials and secrets must not be committed to version control. The `.env` file is excluded through `.gitignore`.

### 7.4 Install and Start the Backend

```bash
cd backend
npm install
npm run dev
```

The backend starts the Express API and email-processing components according to the application configuration.

### 7.5 Install and Start the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Access the development application at:

`http://localhost:5173`

## 8. Email Delivery Configuration

The application uses Nodemailer with Ethereal Email as a test SMTP provider. Ethereal allows email-delivery workflows to be demonstrated without relying on a production email service.

Configure the required SMTP credentials and transport settings through the backend environment configuration.

Ethereal is intended for testing and demonstration. It does not represent a production email-delivery service.

## 9. Scheduling and Job Processing

The scheduling workflow follows these stages:

1. The user composes an email and specifies the scheduling parameters.
2. The backend validates the request and persists the email record in PostgreSQL.
3. A corresponding BullMQ job is created with the required scheduling information.
4. Redis maintains the queue state.
5. A worker processes the job when it becomes eligible for execution.
6. The worker checks the persisted email state and applicable sending constraints.
7. The application attempts email delivery through the configured SMTP transport.
8. The email record is updated to reflect the processing outcome.
9. Email data is indexed in Elasticsearch for subsequent search operations.

BullMQ and Redis provide the scheduling and queue-processing mechanism rather than relying exclusively on cron-based execution or in-memory timers.

## 10. Persistence and Restart Recovery

Email records are stored in PostgreSQL, while BullMQ uses Redis to maintain job and queue state.

This separation reduces dependence on application memory and supports the recovery of pending work after a backend restart.

On startup, the application can recover scheduling information and resume processing eligible pending jobs, subject to the configured queue and database state.

## 11. Rate Limiting and Rescheduling

The application supports a configurable hourly email-sending limit.

Redis-based coordination is used to maintain sending-limit state across workers. When the applicable hourly limit is reached:

1. Further sends are deferred rather than immediately executed.
2. Pending jobs are rescheduled for a subsequent eligible time window.
3. The relative order of remaining jobs is preserved where practicable.
4. A Slack notification can be generated if the integration is configured and connected.

The configured hourly limit and minimum sending interval control email-processing frequency.

## 12. Worker Concurrency and Minimum Delay

### Worker Concurrency

Worker concurrency is configurable through environment variables.

Example:

```env
WORKER_CONCURRENCY=5
```

This setting controls the number of jobs a worker can process concurrently. Concurrency operates alongside the application's rate-limiting and scheduling logic.

### Minimum Sending Interval

The application supports a configurable minimum interval between email sends.

Example:

```env
DEFAULT_MIN_DELAY_MS=2000
```

The value represents a delay of 2,000 milliseconds. The configured delay is applied according to the application's sending logic.

## 13. Search and Queue Monitoring

### Elasticsearch

Email records are indexed in Elasticsearch to support search across email data. The frontend submits search requests to the backend, which queries the index and returns matching records.

PostgreSQL remains the relational data store, while Elasticsearch serves the search use case.

### Bull Board

Bull Board provides a monitoring interface for BullMQ queues. It allows developers to inspect queue activity, including waiting, active, completed, delayed, and failed jobs, where supported by the configured queue.

The monitoring interface is exposed through the backend route:

`/admin/queues`

Access to administrative monitoring should be appropriately restricted in a production deployment.

## 14. Authentication and Slack Integration

### Google OAuth

Google OAuth provides the sign-in workflow. The backend uses the configured OAuth credentials and callback URL to authenticate users and establish the application's authentication flow.

JWT-related configuration is maintained through environment variables as required by the implementation.

### Slack Notifications

Slack OAuth enables users to connect a Slack workspace for notifications.

When the configured hourly email limit is reached, the application can notify the connected Slack destination. Slack is an optional integration; email scheduling should continue to operate when Slack is not connected.

## 15. Idempotency and Duplicate-Processing Safeguards

The worker checks the persisted email state before processing a job. Database-state checks and Redis-based coordination help reduce duplicate processing during retries and restart recovery.

These mechanisms improve reliability but do not establish an absolute exactly-once delivery guarantee. If a provider accepts an email but the application fails before recording the result, a retry may still create uncertainty unless provider-level idempotency or reconciliation is available.

## 16. Assumptions and Engineering Trade-offs

- **Test email provider:** Ethereal Email is used for development and demonstration rather than production delivery.
- **Relational persistence:** PostgreSQL is the primary store for application records.
- **Queue persistence:** Redis and BullMQ maintain background job state and support worker coordination.
- **Search separation:** Elasticsearch is used for email search rather than replacing the relational database.
- **Optional notifications:** Slack integration is not required for core scheduling operations.
- **Delivery guarantees:** Application-level state checks reduce duplicate processing but cannot independently guarantee exactly-once external email delivery.
- **Deployment scope:** The implementation is intended for assignment evaluation and demonstration; production deployment would require additional security, observability, scaling, and operational controls.

## 17. Security and Configuration Practices

- Keep OAuth secrets, database credentials, SMTP credentials, and JWT secrets in environment variables.
- Exclude `.env` files from version control.
- Use HTTPS for deployed application endpoints.
- Restrict access to administrative queue-monitoring routes.
- Validate user input and enforce authorization on protected endpoints.
- Use appropriately scoped credentials for external integrations.

## 18. Conclusion

ReachInbox Email Job Scheduler demonstrates the integration of persistent background processing, relational data management, controlled job execution, search infrastructure, authentication, and notification services within a full-stack application.

The implementation focuses on reliable scheduling, configurable sending controls, restart recovery, operational visibility, and a web-based email management workflow. The architecture also establishes a foundation for future improvements, including production SMTP integration, enhanced delivery reconciliation, advanced monitoring, and broader scalability.
