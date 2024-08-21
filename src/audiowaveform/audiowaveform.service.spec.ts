import { Test, TestingModule } from '@nestjs/testing';
import { AudiowaveformService } from './audiowaveform.service';

describe('AudiowaveformService', () => {
  let service: AudiowaveformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudiowaveformService],
    }).compile();

    service = module.get<AudiowaveformService>(AudiowaveformService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
