interface ScheduleEmailInput {
    userId: string;
    senderId: string;
    recipients: string[];
    subject: string;
    body: string;
    startTime: Date;
    delayBetweenEmails: number;
    hourlyLimit: number;
}
export declare function scheduleEmails(input: ScheduleEmailInput): Promise<{
    id: string;
    recipient: string;
    scheduledAt: Date;
    bullJobId: string | undefined;
}[]>;
export {};
//# sourceMappingURL=scheduler.service.d.ts.map