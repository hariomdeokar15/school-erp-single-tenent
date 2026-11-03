import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  ValidateIf,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { OmitType, PartialType } from "@nestjs/swagger";

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class CreateAcademicYearDto {
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/)
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string;
}

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}

export class TermQueryDto extends PageQueryDto {
  @IsUUID()
  academicYearId!: string;
}

export class CreateTermDto {
  @IsUUID()
  academicYearId!: string;

  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/)
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  sequence!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string;
}

export class UpdateTermDto extends PartialType(CreateTermDto) {}

export class CreateClassLevelDto {
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/)
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  sortOrder!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClassLevelDto extends PartialType(CreateClassLevelDto) {}

export class CreateSectionDto {
  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  classLevelId!: string;

  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/)
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SectionQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  classLevelId?: string;
}

export class CreateSubjectDto {
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/)
  code!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}

export class CreateClassSubjectDto {
  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  sequence?: number | null;
}

export class AddSectionSubjectDto {
  @IsUUID()
  classSubjectId!: string;
}

export class CreateTeacherAssignmentDto {
  @IsUUID()
  sectionSubjectId!: string;

  @IsUUID()
  teacherUserId!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn?: string | null;
}

export class CreateClassTeacherAssignmentDto {
  @IsUUID()
  sectionId!: string;

  @IsUUID()
  teacherUserId!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class EndAssignmentDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string;
}

export class TeacherAssignmentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  teacherUserId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class StudentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateFamilyPortalDto {
  @IsIn(["CREATE", "LINK_EXISTING"])
  action!: "CREATE" | "LINK_EXISTING";

  @IsString()
  @Length(1, 50)
  relationship!: string;

  @ValidateIf((input: CreateFamilyPortalDto) => input.action === "CREATE")
  @IsString()
  @Length(1, 120)
  guardianFirstName!: string;

  @ValidateIf((input: CreateFamilyPortalDto) => input.action === "CREATE")
  @IsString()
  @Length(1, 120)
  guardianLastName!: string;

  @ValidateIf((input: CreateFamilyPortalDto) => input.action === "CREATE")
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ValidateIf((input: CreateFamilyPortalDto) => input.action === "CREATE")
  @IsOptional()
  @IsString()
  @Length(7, 20)
  @Matches(/^\+?[0-9][0-9 ()-]{5,18}$/)
  phone?: string;

  @ValidateIf((input: CreateFamilyPortalDto) => input.action === "CREATE")
  @IsString()
  @Length(12, 128)
  initialPassword!: string;

  @ValidateIf(
    (input: CreateFamilyPortalDto) => input.action === "LINK_EXISTING",
  )
  @IsUUID()
  userId?: string;
}

export class CreateStudentDto {
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_/-]{0,39}$/)
  studentNumber!: string;

  @IsString()
  @Length(1, 120)
  firstName!: string;

  @IsString()
  @Length(1, 120)
  lastName!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFamilyPortalDto)
  familyPortal?: CreateFamilyPortalDto;
}

export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ["studentNumber", "familyPortal"] as const),
) {}

export class CreateGuardianDto {
  @IsString()
  @Length(1, 120)
  firstName!: string;

  @IsString()
  @Length(1, 120)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  @Matches(/^\+?[0-9][0-9 ()-]{5,18}$/)
  phone?: string | null;
}

export class CreateAndLinkGuardianDto extends CreateGuardianDto {
  @IsString()
  @Length(1, 50)
  relationship!: string;

  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}

export class LinkPersonAccountDto {
  @IsUUID()
  userId!: string;
}

export class CreateEnrollmentDto {
  @IsUUID()
  academicYearId!: string;

  @IsUUID()
  sectionId!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  enrollmentDate!: string;
}

export class CreatePlacementDto {
  @IsUUID()
  sectionId!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class CloseEnrollmentDto {
  @IsIn(["COMPLETED", "WITHDRAWN", "TRANSFERRED"])
  status!: "COMPLETED" | "WITHDRAWN" | "TRANSFERRED";

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  exitDate!: string;
}
