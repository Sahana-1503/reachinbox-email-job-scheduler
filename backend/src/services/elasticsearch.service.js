"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEmailIndex = initializeEmailIndex;
exports.indexEmail = indexEmail;
exports.searchEmails = searchEmails;
const elasticsearch_1 = require("@elastic/elasticsearch");
const prisma_js_1 = require("../config/prisma.js");
const client = new elasticsearch_1.Client({
    node: process.env.ELASTICSEARCH_URL ||
        "http://localhost:9200",
});
const INDEX = "emails";
async function initializeEmailIndex() {
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
async function indexEmail(emailId) {
    const email = await prisma_js_1.prisma.email.findUnique({
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
async function searchEmails(userId, query, status) {
    const must = [
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
    return result.hits.hits.map((hit) => hit._source);
}
//# sourceMappingURL=elasticsearch.service.js.map