import { Client } from "@elastic/elasticsearch";
import { prisma } from "../config/prisma.js";

const client = new Client({
  node:
    process.env.ELASTICSEARCH_URL ||
    "http://localhost:9200",
  auth: {
    username: "elastic",
    password: process.env.ELASTIC_PASSWORD!,
  },
});

const INDEX = "emails";

export async function initializeEmailIndex() {
  const exists = await client.indices.exists({
    index: INDEX,
  });

  if (!exists) {
    await client.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          senderId: { type: "keyword" },
          recipient: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
          createdAt: { type: "date" },
        },
      },
    });

    console.log("Elasticsearch emails index created");
  }
}

export async function indexEmail(emailId: string) {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
  });

  if (!email) {
    throw new Error(`Email ${emailId} not found`);
  }

  await client.index({
    index: INDEX,
    id: email.id,
    document: {
      id: email.id,
      userId: email.userId,
      senderId: email.senderId,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      createdAt: email.createdAt,
    },
    refresh: "wait_for",
  });
}

export async function searchEmails(
  userId: string,
  query: string,
  status?: "SCHEDULED" | "SENDING" | "SENT" | "FAILED"
) {
  const must: any[] = [
    {
      term: {
        userId,
      },
    },
  ];

  if (status) {
    must.push({
      term: {
        status,
      },
    });
  }

  if (query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: [
          "recipient",
          "subject",
          "body",
        ],
      },
    });
  }

  const result = await client.search({
    index: INDEX,
    query: {
      bool: {
        must,
      },
    },
    sort: [
      {
        createdAt: {
          order: "desc",
        },
      },
    ],
  });

  return result.hits.hits.map(
    (hit) => hit._source
  );
}