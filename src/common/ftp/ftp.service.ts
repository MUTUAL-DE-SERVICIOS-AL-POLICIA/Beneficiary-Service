import { Injectable, Logger } from '@nestjs/common';
import { envsFtp } from 'src/config';
import * as ftp from 'basic-ftp';
import { Readable, Writable } from 'stream';

@Injectable()
export class FtpService {
  private readonly logger = new Logger('FtpService');
  private client: ftp.Client;

  constructor() {
    this.client = new ftp.Client();
  }

  async connectToFtp() {
    try {
      await this.client.access({
        host: envsFtp.ftpHost,
        user: envsFtp.ftpUsername,
        password: envsFtp.ftpPassword,
        secure: envsFtp.ftpSsl,
      });
      this.logger.log('Connected to FTP server successfully');
    } catch (error) {
      this.logger.error('Failed to connect to FTP server:', error);
      throw new Error('Failed to connect to FTP server');
    }
  }

  async uploadFile(document: Buffer, initialPath: string, path: string) {
    try {
      const verifyPath = `${envsFtp.ftpRoot}${initialPath}`;
      const remotePath = `${envsFtp.ftpRoot}${path}`;

      const buffer = Buffer.from(document.buffer);
      const documentStream = Readable.from(buffer);
      await this.client.ensureDir(verifyPath);
      await this.client.uploadFrom(documentStream, remotePath);
      this.logger.log('Uploaded file successfully');
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async downloadFile(path: string) {
    try {
      const remoteFilePath = `${envsFtp.ftpRoot}${path}`;
      const chunks: Buffer[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
      });
      await this.client.downloadTo(writableStream, remoteFilePath);
      this.logger.log('Downloaded file successfully');
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Failed to download file:', error);
      throw new Error('Failed to download file:');
    }
  }

  async listFiles(path: string) {
    try {
      const remotePath = `${envsFtp.ftpRoot}${path}`;
      const files = await this.client.list(remotePath);
      return files;
    } catch (error) {
      this.logger.error('Failed to list files:', error);
      throw new Error('Failed to list files');
    }
  }

  async onDestroy() {
    await this.client.close();
    this.logger.log('FTP connection closed');
  }
}
