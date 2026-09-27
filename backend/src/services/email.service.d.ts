export declare function sendEmail({ from, to, subject, body, }: {
    from: string;
    to: string;
    subject: string;
    body: string;
}): Promise<{
    messageId: string;
    previewUrl: string | null;
}>;
//# sourceMappingURL=email.service.d.ts.map