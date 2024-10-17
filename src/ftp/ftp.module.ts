import { Global, Module } from '@nestjs/common';
import { FtpService } from './ftp.service';

@Global()
@Module({
  providers: [FtpService],
  exports: [FtpService],
})
export class FtpModule {}
