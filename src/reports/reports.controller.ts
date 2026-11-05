import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportsDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @MessagePattern('beneficiary.report.registerFingerprints')
  async registerFingerprints(@Payload() filters: ReportsDto) {
    return this.reportsService.reportRegisterFingerPrints(filters);
  }

  @MessagePattern('beneficiary.report.registerPhotos')
  async registerPhotos(@Payload() filters: ReportsDto) {
    return this.reportsService.reportPhotos(filters);
  }
}
