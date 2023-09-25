import { ipBasedMitigationServiceInstance } from './ip-based-mitigation/ip-based-mitigation.instance';
import { IpBasedMitigationService } from './ip-based-mitigation/ip-based-mitigation.service';
import { UmbressOptions } from './options/interfaces/options.interface';
import { optionsServiceInstance } from './options/options.instance';
import { OptionsService } from './options/options.service';
import { ProcessorService } from './processor/processor.service';

export default function umbress<R, S>(userOptions: UmbressOptions<R, S>): (request: R, response: S) => void {
  const processor = new ProcessorService<R, S>(
    userOptions,
    optionsServiceInstance as OptionsService<R, S>,
    ipBasedMitigationServiceInstance as IpBasedMitigationService<R, S>,
  );

  return processor.process;
}
