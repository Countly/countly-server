export interface ProxyConfiguration {
    host: string;
    port: string;
    pass?: string;
    user?: string;
    auth: boolean;
}

export interface PluginConfiguration {
    messageTimeout?: number;
    proxy?: ProxyConfiguration;
}

export interface PluginDocument {
    _id: string;
    push?: {
        message_timeout?: number; // should be 3600000 by default. timeout for a message not sent yet (for TooLateToSend errors)
        proxyhost?: string;
        proxyport?: string;
        proxyuser?: string;
        proxypass?: string;
        proxyunauthorized?: boolean;
    };
}