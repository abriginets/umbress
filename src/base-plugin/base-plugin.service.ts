export abstract class BasePluginService {
  abstract execute<R extends Request, S extends Response>(
    request: R,
    response: S,
    ...args: unknown[]
  ): Promise<S | void>;
}
