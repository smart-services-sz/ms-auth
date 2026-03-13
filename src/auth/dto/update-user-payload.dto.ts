import { IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

export class UpdateUserPayloadDto {

  @IsUUID()
  id: string;

  @ValidateNested()
  @Type(() => UpdateUserDto)
  dto: UpdateUserDto;
}