import { IsInt, IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FingerprintData {
  @IsInt()
  @IsNotEmpty()
  fingerprintTypeId: number;

  @IsNotEmpty()
  @IsString()
  wsq: string;

  @IsInt()
  @IsNotEmpty()
  quality: number;
}

export class CreatePersonFingerprintDto {
  @IsInt()
  @IsNotEmpty()
  personId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FingerprintData)
  fingerprints: FingerprintData[];
}
