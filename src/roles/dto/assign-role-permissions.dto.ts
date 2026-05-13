import { IsArray, IsUUID } from 'class-validator';

export class AssignRolePermissionsDto {
  @IsUUID('4')
  roleId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
