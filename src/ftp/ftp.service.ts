import { Injectable } from '@nestjs/common';
import { envsFtp } from 'src/config';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

@Injectable()
export class FtpService {
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
      console.log('Connected to FTP server successfully');
    } catch (error) {
      console.error('Failed to connect to FTP server:', error);
    }
  }

  async uploadFile(document: Buffer, verifyPath: string, Path: string) {
    try {
      const buffer = Buffer.from(document.buffer);
      const documentStream = Readable.from(buffer);
      await this.client.ensureDir(verifyPath);
      await this.client.uploadFrom(documentStream, Path);
      console.log('Uploaded file successfully');
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  }

  async onDestroy() {
    this.client.close();
  }
}
