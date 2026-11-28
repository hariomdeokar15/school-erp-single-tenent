import { IsEnum, IsOptional } from "class-validator";
import { UserRole } from "@schoolerp/contracts";
import { UserStatus } from "../entities/user.entity";

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
