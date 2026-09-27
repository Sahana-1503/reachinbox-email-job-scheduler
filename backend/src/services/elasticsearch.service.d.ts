export declare function initializeEmailIndex(): Promise<void>;
export declare function indexEmail(emailId: string): Promise<void>;
export declare function searchEmails(userId: string, query: string, status?: "SCHEDULED" | "SENDING" | "SENT" | "FAILED"): Promise<unknown[]>;
//# sourceMappingURL=elasticsearch.service.d.ts.map