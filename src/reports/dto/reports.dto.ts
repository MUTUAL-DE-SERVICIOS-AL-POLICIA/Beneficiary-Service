import { IsDateString, IsOptional, IsString} from 'class-validator';
import { PaginationDto } from 'src/common';

export class ReportsDto extends PaginationDto {

  @IsDateString()
  dateFrom?: string;

  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  user?: string;
}
