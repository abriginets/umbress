export interface umbressOptions {
    isProxyTrusted?: boolean
    rateLimiter?: {
        requests?: number
        per?: number
        banFor?: number
    }
    messageOnTooManyRequests?: { [key: string]: any } | null
    clearQueueAfterBan?: boolean
    logs?: boolean
}
