import { Test, TestingModule } from '@nestjs/testing';
import { StemsController } from './stems.controller';

describe('StemsController', () => {
  let controller: StemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StemsController],
    }).compile();

    controller = module.get<StemsController>(StemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
