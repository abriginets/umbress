import { ipBasedMitigationServiceInstance } from './ip-based-mitigation/ip-based-mitigation.instance';
import { UmbressOptions } from './options/interfaces/options.interface';
import { optionsServiceInstance } from './options/options.instance';
import { ProcessorService } from './processor/processor.service';

export default function umbress<R, S>(userOptions: UmbressOptions): (request: R, response: S) => void {
  const processor = new ProcessorService<R, S>(userOptions, optionsServiceInstance, ipBasedMitigationServiceInstance);

  return processor.process;
}
