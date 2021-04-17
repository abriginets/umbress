import { getPublicAsset } from '../helpers';

describe('test faulty code', function() {
  it('should throw because unexistent file', function() {
    expect(() =>
    // @ts-ignore
      getPublicAsset('cwmthet', 'dfg'),
    ).toThrow();
  });
});