import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AssignUserPermissionsDto {
  @IsString()
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  permissionIds: string[]; 
}