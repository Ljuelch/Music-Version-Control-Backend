import { Test, TestingModule } from '@nestjs/testing';
import { AudioFileService } from './audio-file.service';

describe('AudioFileService', () => {
  let service: AudioFileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioFileService],
    }).compile();

    service = module.get<AudioFileService>(AudioFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
