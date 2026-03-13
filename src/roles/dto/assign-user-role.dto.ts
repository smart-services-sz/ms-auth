import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AssignUserRolesDto {
  @IsString()
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  rolesIds: string[]; 
}