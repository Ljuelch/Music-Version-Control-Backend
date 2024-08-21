import { Test, TestingModule } from '@nestjs/testing';
import { StemsService } from './stems.service';

describe('StemsService', () => {
  let service: StemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StemsService],
    }).compile();

    service = module.get<StemsService>(StemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
