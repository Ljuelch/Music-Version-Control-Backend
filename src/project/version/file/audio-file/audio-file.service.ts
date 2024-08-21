import { Injectable } from '@nestjs/common';
import * as wav from 'node-wav';
import * as Mp32Wav from 'mp3-to-wav';
import {
  readFileSync,
  copyFileSync,
  unlinkSync,
  mkdirSync,
  rmdirSync,
} from 'fs';
import { join } from 'path';
import { AudiowaveformService } from '../../../../audiowaveform/audiowaveform.service';
import { FileService } from '../file.service';

@Injectable()
export class AudioFileService {
  private static FILE_TYPE_MP3 = 'mp3';
  private static FILE_TYPE_WAVE = 'wav';
  private static FILE_TYPE_WAVEFORM = 'waveform.dat';

  static getWaveformFileName(waveId: string) {
    return FileService.getFileNameByHash(waveId, this.FILE_TYPE_WAVEFORM);
  }

  static evaluateMimeType(file: Express.Multer.File): boolean {
    return /^audio\/.*wav$/.test(file.mimetype);
  }

  constructor(
    private readonly audiowaveformService: AudiowaveformService,
    private readonly fileService: FileService,
  ) {}

  private isWaveBuffer(buffer: Buffer) {
    try {
      wav.decode(buffer);
      return true;
    } catch (_) {
      return false;
    }
  }

  private async saveAudioFile(
    buffer: Buffer,
  ): Promise<{ waveHash: string; mp3Hash?: string }> {
    let mp3Hash: string | undefined;
    if (!this.isWaveBuffer(buffer)) {
      mp3Hash = this.fileService.save(buffer, AudioFileService.FILE_TYPE_MP3);

      const mp3ToWaveOutDirPath = FileService.generateTmpPath();
      mkdirSync(mp3ToWaveOutDirPath);

      const mp3FilePath = FileService.getFilePathByHash(mp3Hash),
        mp3ToWaveAudioFilePath = join(
          mp3ToWaveOutDirPath,
          FileService.getFileNameByHash(
            mp3Hash,
            AudioFileService.FILE_TYPE_WAVE,
          ),
        );
      try {
        await new Mp32Wav(mp3FilePath, mp3ToWaveOutDirPath).exec(undefined);
      } catch (error) {
        console.error(
          `Error converting mp3 (${mp3FilePath}) to wav (> ${mp3ToWaveOutDirPath})`,
          error,
        );
        // TODO: mp3 only gets copied?!
        copyFileSync(mp3FilePath, mp3ToWaveAudioFilePath);
      }
      buffer = readFileSync(mp3ToWaveAudioFilePath);

      unlinkSync(mp3ToWaveAudioFilePath);
      rmdirSync(mp3ToWaveOutDirPath);
    }

    const waveHash = this.fileService.save(
      buffer,
      AudioFileService.FILE_TYPE_WAVE,
    );

    await this.audiowaveformService.generateWaveform(
      FileService.getFilePathByHash(waveHash, AudioFileService.FILE_TYPE_WAVE),
      FileService.getFilePathByHash(
        waveHash,
        AudioFileService.FILE_TYPE_WAVEFORM,
      ),
    );

    return { waveHash, mp3Hash };
  }

  addAudioFile(versionId: number, file: Express.Multer.File) {
    return new Promise<{
      file: Express.Multer.File;
      waveHash: string;
      mp3Hash?: string;
    }>(async (resolve) => {
      const { waveHash, mp3Hash } = await this.saveAudioFile(file.buffer);

      let awaitingMp3: boolean = !!mp3Hash,
        awaitingWav: boolean = !!waveHash,
        awaitingWaveform: boolean = !!awaitingWav;

      if (awaitingWav) {
        const { bucketName } = await this.fileService.addFile(
          versionId,
          waveHash,
          AudioFileService.FILE_TYPE_WAVE,
          true,
          'dry',
          undefined,
          false,
        );

        this.fileService
          .addFile(
            versionId,
            waveHash,
            AudioFileService.FILE_TYPE_WAVE,
            false,
            true,
            bucketName,
          )
          .then(() => {
            awaitingWav = false;
            if (!awaitingMp3 && !awaitingWaveform)
              resolve({ file, waveHash, mp3Hash });
          });

        this.fileService
          .addFile(
            versionId,
            waveHash,
            AudioFileService.FILE_TYPE_WAVEFORM,
            false,
            true,
            bucketName,
          )
          .then(() => {
            awaitingWaveform = false;
            if (!awaitingMp3 && !awaitingWav)
              resolve({ file, waveHash, mp3Hash });
          });
      }

      if (awaitingMp3)
        this.fileService
          .addFile(versionId, waveHash, AudioFileService.FILE_TYPE_MP3)
          .then(() => {
            awaitingMp3 = false;
            if (!awaitingWav && !awaitingWaveform)
              resolve({ file, waveHash, mp3Hash });
          });
    });
  }
}
