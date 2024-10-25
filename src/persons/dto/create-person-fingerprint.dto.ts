import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreatePersonFingerprintDto {
  @IsInt()
  @IsNotEmpty()
  quality: number;

  @IsInt()
  @IsNotEmpty()
  personId: number;

  @IsInt()
  @IsNotEmpty()
  fingerprintTypeId: number;

  @IsNotEmpty()
  @IsString()
  wsq: string;
}
