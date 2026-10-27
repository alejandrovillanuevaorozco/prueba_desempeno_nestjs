import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@fleetcore.com',
  })
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'System role assigned to user',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role, {
    message: 'Role must be one of: ADMIN, TECHNICIAN',
  })
  role: Role;
}
