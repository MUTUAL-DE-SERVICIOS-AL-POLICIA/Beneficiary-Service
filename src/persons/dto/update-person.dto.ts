import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  @IsNumber()
  @IsPositive()
  id: number;
}
