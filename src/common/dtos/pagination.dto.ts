import { Type } from "class-transformer";
import { IsOptional, IsPositive } from "class-validator";


export class PaginationDto{

    @IsOptional()
    @IsPositive()
    @Type( ()=> Number )//enableImplicitConversions: true
    limit?: number;

    @IsOptional()
    @Type( ()=> Number )//enableImplicitConversions: true
    offset?: number;
}