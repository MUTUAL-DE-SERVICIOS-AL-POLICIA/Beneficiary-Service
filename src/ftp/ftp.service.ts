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
}
