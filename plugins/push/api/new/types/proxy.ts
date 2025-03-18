import { AgentOptions, Agent as HttpsAgent } from "https";
import { Agent as HttpAgent } from "http";
import { TLSSocket } from "tls";


export interface ProxyConfiguration {
    host: string;
    port: string;
    pass?: string;
    user?: string;
    auth: boolean;
}

export type ProxyConfigurationKey = keyof ProxyConfiguration;

export interface ProxyAgentOptions extends AgentOptions {
    proxy: ProxyConfiguration;
}

export type CreateConnectionCallback = (err: Error|null, sock?: TLSSocket) => void;

export type BaseAgent = HttpsAgent|HttpAgent;


