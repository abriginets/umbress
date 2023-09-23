export abstract class BasePluginService {
  abstract execute<R extends Request, S extends Response, N extends (...args: unknown[]) => unknown>(
    request: R,
    response: S,
    next: N,
    ...args: unknown[]
  ): Promise<S | N | void>;
}
