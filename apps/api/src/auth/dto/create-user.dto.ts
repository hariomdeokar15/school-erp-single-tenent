import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserRole } from "@schoolerp/contracts";

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  initialPassword!: string;
}
