export interface ProxyConfiguration {
    host: string;
    port: string;
    pass?: string;
    user?: string;
    auth: boolean;
}

export interface PluginConfiguration {
    messageTimeout?: number;
    messageResultsTTL?: number;
    proxy?: ProxyConfiguration;
}

export interface PluginConfigDocument {
    message_timeout?: number; // should be 3600000 by default. timeout for a message not sent yet (for TooLateToSend errors)
    message_results_ttl?: number; // should be 7776000000 (90 days) by default. how long to keep message results
    proxyhost?: string;
    proxyport?: string;
    proxyuser?: string;
    proxypass?: string;
    proxyunauthorized?: boolean;
}

export interface ErrorObject {
    name: string;
    message: string;
    stack?: string;
}