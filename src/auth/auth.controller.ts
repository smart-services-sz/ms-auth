import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { PaginationDto } from './dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPayloadDto } from './dto/update-user-payload.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* ============================= */
  /* AUTH                          */
  /* ============================= */

  @MessagePattern('auth.register')
  async register(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.register(
      data.email,
      data.password,
      context.ip,
    );
  }

  @MessagePattern('auth.login')
  async login(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.login(
      data.email,
      data.password,
      context.ip,
    );
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.refresh(
      data.refreshToken,
      context.ip,
    );
  }

  @MessagePattern('auth.logout')
  async logout(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.logout(
      data.refreshToken,
      context.ip,
    );
  }

  /* ============================= */
  /* USERS                         */
  /* ============================= */

  @MessagePattern('users.get.all')
  async getAllUsers(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.getAllUsers(
      data as PaginationDto,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('users.get.id')
  async getUserById(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.getUserById(
      data.id,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('users.toggle.status')
  async toggleStatus(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.toggleStatus(
      data.id,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('users.create')
  async createUser(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.createUser(
      data as CreateUserDto,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('users.update')
  async updateUser(@Payload() payload: any) {
    const { data, context } = payload;

    return this.authService.updateUser(
      data as UpdateUserPayloadDto,
      context.userId,
      context.ip,
    );
  }
}