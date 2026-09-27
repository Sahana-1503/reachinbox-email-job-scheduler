export declare function getSlackAuthorizeUrl(state: string): string;
export declare function exchangeSlackCode(code: string): Promise<any>;
export declare function saveSlackConnection(userId: string, accessToken: string, teamId?: string, channelId?: string): Promise<{
    id: string;
    userId: string;
    accessToken: string;
    teamId: string | null;
    channelId: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function disconnectSlack(userId: string): Promise<void>;
export declare function sendSlackNotification(userId: string, message: string): Promise<void>;
//# sourceMappingURL=slack.service.d.ts.map