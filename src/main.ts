import { ipBasedMitigationServiceInstance } from './ip-based-mitigation/ip-based-mitigation.instance';
import { UmbressOptions } from './options/interfaces/options.interface';
import { optionsServiceInstance } from './options/options.instance';
import { ProcessorService } from './processor/processor.service';

export default function umbress<R extends Request, S extends Response, N extends (...args: unknown[]) => unknown>(
  userOptions: UmbressOptions,
): (request: R, response: S, nextFunction: N) => void {
  const processor = new ProcessorService(userOptions, optionsServiceInstance, ipBasedMitigationServiceInstance);

  return processor.process;
}
