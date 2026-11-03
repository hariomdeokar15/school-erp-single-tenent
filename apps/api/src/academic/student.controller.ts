import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission } from "@schoolerp/contracts";
import { Request } from "express";
import { CurrentUser, RequirePermissions } from "../auth/auth.decorators";
import { AuthenticatedUser } from "../auth/auth.types";
import { AuditRequestContext } from "./academic.service";
import {
  CloseEnrollmentDto,
  CreateAndLinkGuardianDto,
  CreateEnrollmentDto,
  CreatePlacementDto,
  CreateStudentDto,
  LinkPersonAccountDto,
  StudentQueryDto,
  UpdateStudentDto,
} from "./dto/academic.dto";
import { StudentService } from "./student.service";

@ApiTags("Students")
@ApiBearerAuth()
@Controller("students")
export class StudentController {
  constructor(private readonly students: StudentService) {}

  @Get("family-portal-accounts")
  @RequirePermissions(Permission.STUDENT_WRITE)
  listFamilyPortalAccounts() {
    return this.students.listFamilyPortalAccounts();
  }

  @Get()
  @RequirePermissions(Permission.STUDENT_READ)
  list(
    @Query() query: StudentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.students.list(query, actor);
  }

  @Get(":id")
  @RequirePermissions(Permission.STUDENT_READ)
  get(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.students.get(id, actor);
  }

  @Get(":id/enrollments")
  @RequirePermissions(Permission.STUDENT_READ)
  listEnrollments(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.students.listEnrollments(id, actor);
  }

  @Post()
  @RequirePermissions(Permission.STUDENT_WRITE)
  create(
    @Body() input: CreateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.create(input, actor, this.auditContext(request));
  }

  @Patch(":id")
  @RequirePermissions(Permission.STUDENT_WRITE)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.update(id, input, actor, this.auditContext(request));
  }

  @Patch(":id/link-account")
  @RequirePermissions(Permission.STUDENT_WRITE)
  linkStudentAccount(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: LinkPersonAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.linkStudentAccount(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get(":id/guardians")
  @RequirePermissions(Permission.STUDENT_WRITE)
  listGuardians(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.listGuardians(id, actor, this.auditContext(request));
  }

  @Post(":id/guardians")
  @RequirePermissions(Permission.STUDENT_WRITE)
  createGuardian(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CreateAndLinkGuardianDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.createAndLinkGuardian(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Post(":id/enrollments")
  @RequirePermissions(Permission.STUDENT_WRITE)
  createEnrollment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CreateEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.createEnrollment(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  private auditContext(request: Request): AuditRequestContext {
    return {
      ipAddress: request.ip || "unknown",
      userAgent: request.get("user-agent"),
      correlationId: (request as Request & { correlationId?: string })
        .correlationId,
    };
  }
}

@ApiTags("Guardians")
@ApiBearerAuth()
@Controller("guardians")
export class GuardianController {
  constructor(private readonly students: StudentService) {}

  @Patch(":id/link-account")
  @RequirePermissions(Permission.STUDENT_WRITE)
  linkGuardianAccount(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: LinkPersonAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.linkGuardianAccount(id, input, actor, {
      ipAddress: request.ip || "unknown",
      userAgent: request.get("user-agent"),
      correlationId: (request as Request & { correlationId?: string })
        .correlationId,
    });
  }
}

@ApiTags("Enrollments")
@ApiBearerAuth()
@Controller("enrollments")
export class EnrollmentController {
  constructor(private readonly students: StudentService) {}

  @Post(":enrollmentId/placements")
  @RequirePermissions(Permission.STUDENT_WRITE)
  addPlacement(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Body() input: CreatePlacementDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.addPlacement(
      enrollmentId,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Post(":enrollmentId/close")
  @RequirePermissions(Permission.STUDENT_WRITE)
  closeEnrollment(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Body() input: CloseEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.students.closeEnrollment(
      enrollmentId,
      input,
      actor,
      this.auditContext(request),
    );
  }

  private auditContext(request: Request): AuditRequestContext {
    return {
      ipAddress: request.ip || "unknown",
      userAgent: request.get("user-agent"),
      correlationId: (request as Request & { correlationId?: string })
        .correlationId,
    };
  }
}
