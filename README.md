\# ReachInbox Email Job Scheduler



A full-stack email scheduling and delivery system built for the ReachInbox hiring assignment.



\## Tech Stack



\### Frontend

\- React

\- TypeScript

\- Vite



\### Backend

\- Node.js

\- Express

\- TypeScript

\- Prisma ORM

\- PostgreSQL



\### Scheduling \& Queue

\- BullMQ

\- Redis



\### Search

\- Elasticsearch



\### Email

\- Nodemailer

\- Ethereal Email



\### Authentication

\- Google OAuth

\- JWT



\### Notifications

\- Slack OAuth



\### Monitoring

\- Bull Board



\### Infrastructure

\- Docker Compose



\---



\## Features Implemented



\### Backend

\- Schedule emails for a specific time

\- Persistent scheduling using BullMQ and Redis

\- PostgreSQL persistence using Prisma

\- Configurable worker concurrency

\- Configurable minimum delay between sends

\- Hourly email sending limits

\- Redis-based coordination for rate limiting

\- Rescheduling when the hourly limit is reached

\- Ordering preservation during rescheduling

\- Idempotency/database state checks to reduce duplicate sends

\- Server restart recovery

\- Elasticsearch indexing and search

\- Bull Board queue monitoring

\- Ethereal SMTP email delivery

\- Slack OAuth integration

\- Slack notification when the hourly limit is reached



\### Frontend

\- Google login

\- User profile

\- Dashboard

\- Scheduled emails

\- Sent emails

\- Email detail view

\- Compose email

\- CSV/TXT recipient upload

\- Recipient count

\- Start time configuration

\- Minimum delay configuration

\- Hourly limit configuration

\- Email search

\- Slack connection

\- Logout



\---



\## Project Structure



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

│

├── frontend/

│   └── src/

│

├── docker-compose.yml

└── README.md







Prerequisites



Install:



Node.js

Docker Desktop

Git



Docker Desktop must be running before starting the backend because PostgreSQL, Redis and Elasticsearch are provided through Docker Compose.



How to Run the Project

1\. Start PostgreSQL, Redis and Elasticsearch



From the project root:



docker compose up -d



Check the services:



docker compose ps



The PostgreSQL, Redis and Elasticsearch containers should be running.



2\. Run the Backend



Open a new terminal:



cd backend

npm install

npm run dev



The backend starts the Express API and email worker.



3\. Run the Frontend



Open another terminal:



cd frontend

npm install

npm run dev



Open the frontend at:



http://localhost:5173

Environment Variables



Create a .env file inside the backend directory.



Example:



DATABASE\_URL=

REDIS\_URL=redis://localhost:6379

ELASTICSEARCH\_URL=http://localhost:9200



PORT=5000

FRONTEND\_URL=http://localhost:5173



GOOGLE\_CLIENT\_ID=

GOOGLE\_CLIENT\_SECRET=

GOOGLE\_CALLBACK\_URL=



JWT\_SECRET=



SLACK\_CLIENT\_ID=

SLACK\_CLIENT\_SECRET=

SLACK\_REDIRECT\_URI=



WORKER\_CONCURRENCY=5

DEFAULT\_MIN\_DELAY\_MS=2000

DEFAULT\_HOURLY\_LIMIT=100



Actual credentials and secrets are not included in the repository.



The .env file is excluded through .gitignore.



Ethereal Email Setup



Ethereal Email is used as the SMTP provider for testing email delivery without sending production emails.



Configure the Ethereal SMTP credentials in the backend environment configuration.



After an email is processed, the application uses the configured SMTP transport to send the message through Ethereal.



Architecture Overview

React Frontend

&#x20;      |

&#x20;      v

Express Backend

&#x20;      |

&#x20;      +-------------------> PostgreSQL

&#x20;      |                         |

&#x20;      |                       Prisma

&#x20;      |

&#x20;      +-------------------> Elasticsearch

&#x20;      |

&#x20;      v

&#x20;   BullMQ

&#x20;      |

&#x20;      v

&#x20;    Redis

&#x20;      |

&#x20;      v

&#x20;Email Worker

&#x20;      |

&#x20;      +------> Ethereal SMTP

&#x20;      |

&#x20;      +------> Slack Notification

How Scheduling Works

The user creates an email campaign from the frontend.

The backend stores the email information in PostgreSQL.

A BullMQ job is created for the scheduled email.

Redis stores the persistent queue state.

The worker processes jobs when their scheduled time is reached.

Before sending, the worker checks the email state and sending limits.

The email is sent through Ethereal SMTP.

The email status is updated in PostgreSQL.

Email information is indexed in Elasticsearch for search.



BullMQ and Redis are used instead of cron-based scheduling.



Persistence on Server Restart



Email and scheduling information is persisted in PostgreSQL and BullMQ/Redis.



The scheduler does not depend only on application memory.



When the backend is restarted, pending scheduling information remains available and the worker can continue processing future jobs.



Rate Limiting



The system supports a configurable hourly email limit.



Redis is used to coordinate the sending count across workers.



When the hourly limit is reached:



Further emails are not sent immediately.

Remaining jobs are rescheduled for the next available hour.

The relative ordering of remaining jobs is preserved as much as possible.

A Slack notification can be generated when the limit is reached.

Minimum Delay



A configurable minimum delay is maintained between email sends.



This controls the sending rate and prevents emails from being sent continuously without spacing.



For the demo, a small delay can be configured so the behavior can be observed quickly.



Worker Concurrency



BullMQ workers support configurable concurrency.



Example:



WORKER\_CONCURRENCY=5



Multiple jobs can be processed concurrently while Redis-based coordination and sending limits control the overall sending rate.



Elasticsearch Search



Email records are indexed in Elasticsearch.



The frontend search feature sends search requests to the backend, which queries Elasticsearch and returns matching email records.



This provides search functionality across email data.



Bull Board



Bull Board is included for monitoring BullMQ queues.



It can be used to inspect queued, active, completed and failed jobs.



Slack Integration



Slack integration uses OAuth.



The connected Slack workspace and channel information are stored by the application.



When the configured hourly email limit is reached, the application can notify the connected Slack channel.



If Slack is not connected, the email scheduling system continues to operate without Slack.



Idempotency and Duplicate Processing



Before processing an email job, the worker checks the persisted email state.



Database state checks and Redis coordination help prevent an already processed email from being sent again during retries or recovery.



Assumptions, Shortcuts and Trade-offs

Ethereal Email is used as a test SMTP provider instead of a production email service.

The application is designed for assignment evaluation and demonstration rather than production-scale email infrastructure.

PostgreSQL provides persistent relational storage.

Redis provides persistent queue state, worker coordination and rate-limit state.

Elasticsearch is used for email search.

Slack is optional; the scheduler continues to work when Slack is not connected.

The frontend focuses on the required authentication, dashboard, scheduling, search and Slack workflows.

Application-level idempotency and state checks are used to reduce duplicate processing.

Exact external SMTP delivery cannot be guaranteed as an absolute exactly-once operation without provider-level idempotency support.

