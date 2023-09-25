export abstract class BasePluginService<R, S> {
  abstract execute(request: R, response: S, ...args: unknown[]): Promise<S | void>;
}
