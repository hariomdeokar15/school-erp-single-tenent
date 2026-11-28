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
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser, RequirePermissions } from "../auth/auth.decorators";
import { AuditRequestContext, AcademicService } from "./academic.service";
import {
  AddSectionSubjectDto,
  CreateAcademicYearDto,
  CreateClassLevelDto,
  CreateClassSubjectDto,
  CreateClassTeacherAssignmentDto,
  CreateSectionDto,
  CreateSubjectDto,
  CreateTeacherAssignmentDto,
  CreateTermDto,
  EndAssignmentDto,
  PageQueryDto,
  SectionQueryDto,
  TeacherAssignmentQueryDto,
  TermQueryDto,
  UpdateAcademicYearDto,
  UpdateClassLevelDto,
  UpdateSectionDto,
  UpdateSubjectDto,
  UpdateTermDto,
} from "./dto/academic.dto";

@ApiTags("Academic")
@ApiBearerAuth()
@Controller("academic")
export class AcademicController {
  constructor(private readonly academic: AcademicService) {}

  @Get("years")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listYears(@Query() query: PageQueryDto) {
    return this.academic.listAcademicYears(query);
  }

  @Post("years")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createYear(
    @Body() input: CreateAcademicYearDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createAcademicYear(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("years/:id")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  updateYear(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateAcademicYearDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.updateAcademicYear(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Post("years/:id/activate")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  activateYear(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.activateAcademicYear(
      id,
      actor,
      this.auditContext(request),
    );
  }

  @Post("years/:id/close")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  closeYear(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.closeAcademicYear(
      id,
      actor,
      this.auditContext(request),
    );
  }

  @Get("terms")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listTerms(@Query() query: TermQueryDto) {
    return this.academic.listTerms(query);
  }

  @Post("terms")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createTerm(
    @Body() input: CreateTermDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createTerm(input, actor, this.auditContext(request));
  }

  @Patch("terms/:id")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  updateTerm(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateTermDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.updateTerm(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("class-levels")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listClassLevels(@Query() query: PageQueryDto) {
    return this.academic.listClassLevels(query);
  }

  @Post("class-levels")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createClassLevel(
    @Body() input: CreateClassLevelDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createClassLevel(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("class-levels/:id")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  updateClassLevel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateClassLevelDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.updateClassLevel(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("sections")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listSections(@Query() query: SectionQueryDto) {
    return this.academic.listSections(query);
  }

  @Post("sections")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createSection(
    @Body() input: CreateSectionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createSection(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("sections/:id")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  updateSection(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateSectionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.updateSection(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("subjects")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listSubjects(@Query() query: PageQueryDto) {
    return this.academic.listSubjects(query);
  }

  @Post("subjects")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createSubject(
    @Body() input: CreateSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createSubject(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("subjects/:id")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  updateSubject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.updateSubject(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("years/:yearId/class-levels/:classLevelId/subjects")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listClassSubjects(
    @Param("yearId", ParseUUIDPipe) yearId: string,
    @Param("classLevelId", ParseUUIDPipe) classLevelId: string,
  ) {
    return this.academic.listClassSubjects(yearId, classLevelId);
  }

  @Post("years/:yearId/class-levels/:classLevelId/subjects")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  addClassSubject(
    @Param("yearId", ParseUUIDPipe) yearId: string,
    @Param("classLevelId", ParseUUIDPipe) classLevelId: string,
    @Body() input: CreateClassSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.addClassSubject(
      yearId,
      classLevelId,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("sections/:sectionId/subjects")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listSectionSubjects(@Param("sectionId", ParseUUIDPipe) sectionId: string) {
    return this.academic.listSectionSubjects(sectionId);
  }

  @Post("sections/:sectionId/subjects")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  addSectionSubject(
    @Param("sectionId", ParseUUIDPipe) sectionId: string,
    @Body() input: AddSectionSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.addSectionSubject(
      sectionId,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("teacher-assignments")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listTeacherAssignments(
    @Query() query: TeacherAssignmentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.academic.listTeacherAssignments(query, actor);
  }

  @Post("teacher-assignments")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createTeacherAssignment(
    @Body() input: CreateTeacherAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createTeacherAssignment(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("teacher-assignments/:id/end")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  endTeacherAssignment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: EndAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.endTeacherAssignment(
      id,
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Get("class-teacher-assignments")
  @RequirePermissions(Permission.ACADEMIC_READ)
  listClassTeacherAssignments(
    @Query() query: TeacherAssignmentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.academic.listClassTeacherAssignments(query, actor);
  }

  @Post("class-teacher-assignments")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  createClassTeacherAssignment(
    @Body() input: CreateClassTeacherAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.createClassTeacherAssignment(
      input,
      actor,
      this.auditContext(request),
    );
  }

  @Patch("class-teacher-assignments/:id/end")
  @RequirePermissions(Permission.ACADEMIC_WRITE)
  endClassTeacherAssignment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: EndAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academic.endClassTeacherAssignment(
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
