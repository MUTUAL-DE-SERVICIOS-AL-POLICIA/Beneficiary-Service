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
}
