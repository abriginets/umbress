export interface UmbressOptions {
  isProxyTrusted?: boolean;
  ratelimiter?: {
    rate: string;
    burst?: number;
    nodelay?: boolean;
  };
  whitelist?: Array<string>;
  blacklist?: Array<string>;
}
