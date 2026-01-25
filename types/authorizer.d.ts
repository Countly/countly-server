import { Database } from '../plugins/pluginManager';

/**
 * Endpoint configuration with params
 */
export interface EndpointConfig {
    endpoint: string;
    params?: Record<string, string>;
}

/**
 * Auth token document stored in database
 */
export interface AuthToken {
    _id: string;
    ttl: number;
    ends: number;
    multi: boolean;
    owner: string;
    app: string | string[];
    endpoint: string | string[] | EndpointConfig[];
    purpose: string;
    temporary: boolean;
}

/**
 * Options for verify_token function
 */
export interface VerifyTokenOptions {
    /** Database connection */
    db?: Database;
    /** Token to validate */
    token: string;
    /** params.qstring. If not passed and there is limitation for this token on params - token will not be valid */
    qstring?: Record<string, any>;
    /** Current request path */
    req_path?: string;
    /** Function called when verifying was completed or errored */
    callback?: (valid: boolean | string | AuthToken, expires_after?: number) => void;
}

/**
 * Options for save function
 */
export interface SaveOptions {
    /** Database connection */
    db?: Database;
    /** Amount of seconds for token to work, 0 works indefinitely */
    ttl?: number;
    /** If true, can be used many times until expired */
    multi?: boolean;
    /** Token to store, if not provided, will be generated */
    token?: string;
    /** ID of the user who created this token */
    owner: string;
    /** List of the apps for which token was created */
    app?: string | string[];
    /** Regexp of endpoint (any string - is used as substring, to match exact ^{yourpath}$) */
    endpoint?: string | string[] | EndpointConfig[];
    /** Purpose of the token */
    purpose?: string;
    /** if true - tries to find not expired token with same parameters. If not founds creates new token. If found - updates token expiration time to new one and returns token. */
    tryReuse?: boolean;
    /** If logged in with temporary token. Doesn't kill other sessions on logout */
    temporary?: boolean;
    /** Function called when saving was completed or errored, providing error object as first param and token string as second */
    callback?: (error: Error | string | null, token: string) => void;
}

/**
 * Options for read function
 */
export interface ReadOptions {
    /** Database connection */
    db?: Database;
    /** Token to read */
    token: string;
    /** Function called when reading was completed or errored */
    callback: (error: Error | null, token: AuthToken | null) => void;
}

/**
 * Options for clearExpiredTokens function
 */
export interface ClearExpiredTokensOptions {
    /** Database connection */
    db: Database;
}

/**
 * Options for check_if_expired function
 */
export interface CheckIfExpiredOptions {
    /** Database connection */
    db?: Database;
    /** Token to validate */
    token: string;
    /** Function called when reading was completed or errored */
    callback: (error: Error | null, valid: boolean, expires_after: number) => void;
}

/**
 * Options for extend_token function
 */
export interface ExtendTokenOptions {
    /** Database connection */
    db?: Database;
    /** Token to extend */
    token: string;
    /** Extend token by given time (in ms)(optional) You have to provide extedBy or extendTill. extendBy==0 makes it never die */
    extendBy?: number;
    /** Extend till given timestamp. (optional) You have to provide extedBy or extendTill */
    extendTill?: number;
    /** Function called when reading was completed or errored, providing error object as first param and true as second if extending successful */
    callback?: (error: Error | null, success: boolean | null) => void;
}

/**
 * Options for verify function
 */
export interface VerifyOptions {
    /** Database connection */
    db?: Database;
    /** Token to verify */
    token: string;
    /** params.qstring. If not passed and there is limitation for this token on params - token will not be valid */
    qstring?: Record<string, any>;
    /** Current request path */
    req_path?: string;
    /** Function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't */
    callback?: (valid: boolean, expires_after?: number) => void;
}

/**
 * Options for verify_return function
 */
export interface VerifyReturnOptions {
    /** Database connection */
    db?: Database;
    /** Token to verify */
    token: string;
    /** params.qstring. If not passed and there is limitation for this token on params - token will not be valid */
    qstring?: Record<string, any>;
    /** Current request path */
    req_path?: string;
    /** If true, returns all token data */
    return_data?: boolean;
    /** Function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't */
    callback?: (valid: boolean | string | AuthToken, expires_after?: number) => void;
}

/**
 * Options for clean function
 */
export interface CleanOptions {
    /** Database connection */
    db?: Database;
    /** Function called when cleaning completed */
    callback?: (error: Error | null, result: any) => void;
}

/**
 * Authorizer module for one time authentication
 */
export interface Authorizer {
    /**
     * Store token for later authentication
     * @param options - options for the task
     */
    save(options: SaveOptions): void;

    /**
     * Get whole token information from database
     * @param options - options for the task
     */
    read(options: ReadOptions): void;

    /**
     * Clear expired tokens from database
     * @param options - options for the task
     */
    clearExpiredTokens(options: ClearExpiredTokensOptions): void;

    /**
     * Checks if token is not expired yet
     * @param options - options for the task
     */
    check_if_expired(options: CheckIfExpiredOptions): void;

    /**
     * Extend token life span
     * @param options - options for the task
     */
    extend_token(options: ExtendTokenOptions): void;

    /**
     * Verify token and expire it
     * @param options - options for the task
     */
    verify(options: VerifyOptions): void;

    /**
     * Similar to authorizer.verify. Only difference - return token owner if valid.
     * @param options - options for the task
     */
    verify_return(options: VerifyReturnOptions): void;

    /**
     * Generates authentication ID
     * @returns id to be used when saving the task
     */
    getToken(): string;

    /**
     * Clean all expired tokens
     * @param options - options for the task
     */
    clean(options: CleanOptions): void;
}

declare const authorizer: Authorizer;
export default authorizer;
