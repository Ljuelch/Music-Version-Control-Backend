import { Test, TestingModule } from '@nestjs/testing';
import { AudioFileController } from './audio-file.controller';

describe('AudioFileController', () => {
  let controller: AudioFileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AudioFileController],
    }).compile();

    controller = module.get<AudioFileController>(AudioFileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
