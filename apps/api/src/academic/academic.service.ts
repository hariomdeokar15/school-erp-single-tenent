import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Permission, UserRole } from "@schoolerp/contracts";
import { Repository } from "typeorm";
import { AuditService } from "../audit/services/audit.service";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { AuthenticatedUser } from "../auth/auth.types";
import { User, UserStatus } from "../auth/entities/user.entity";
import {
  AcademicYear,
  AcademicYearStatus,
} from "./entities/academic-year.entity";
import { ClassLevel } from "./entities/class-level.entity";
import { ClassSubject } from "./entities/class-subject.entity";
import { ClassTeacherAssignment } from "./entities/class-teacher-assignment.entity";
import { Section } from "./entities/section.entity";
import { SectionSubject } from "./entities/section-subject.entity";
import { Subject } from "./entities/subject.entity";
import { TeacherAssignment } from "./entities/teacher-assignment.entity";
import { Term } from "./entities/term.entity";
import {
  AddSectionSubjectDto,
  CreateAcademicYearDto,
  CreateClassLevelDto,
  CreateClassSubjectDto,
  CreateClassTeacherAssignmentDto,
  EndAssignmentDto,
  CreateSectionDto,
  CreateSubjectDto,
  CreateTeacherAssignmentDto,
  CreateTermDto,
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

export interface AuditRequestContext {
  ipAddress: string;
  userAgent?: string;
  correlationId?: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(AcademicYear)
    private readonly years: Repository<AcademicYear>,
    @InjectRepository(Term)
    private readonly terms: Repository<Term>,
    @InjectRepository(ClassLevel)
    private readonly classLevels: Repository<ClassLevel>,
    @InjectRepository(Section)
    private readonly sections: Repository<Section>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(ClassSubject)
    private readonly classSubjects: Repository<ClassSubject>,
    @InjectRepository(SectionSubject)
    private readonly sectionSubjects: Repository<SectionSubject>,
    @InjectRepository(TeacherAssignment)
    private readonly teacherAssignments: Repository<TeacherAssignment>,
    @InjectRepository(ClassTeacherAssignment)
    private readonly classTeacherAssignments: Repository<ClassTeacherAssignment>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RoleAssignment)
    private readonly roleAssignments: Repository<RoleAssignment>,
    private readonly audit: AuditService,
  ) {}

  async listAcademicYears(
    query: PageQueryDto,
  ): Promise<PageResult<AcademicYear>> {
    const [items, total] = await this.years.findAndCount({
      order: { startsOn: "DESC", code: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return this.page(items, query, total);
  }

  async createAcademicYear(
    input: CreateAcademicYearDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<AcademicYear> {
    this.assertDateRange(input.startsOn, input.endsOn);
    const entity = this.years.create({
      ...input,
      code: this.normalizeCode(input.code),
      name: this.requiredText(input.name, "Academic year name"),
      status: AcademicYearStatus.PLANNED,
    });
    const saved = await this.saveUnique(this.years, entity);
    await this.record(
      actor,
      context,
      "academic.year.created",
      "academic_year",
      saved.id,
    );
    return saved;
  }

  async updateAcademicYear(
    id: string,
    input: UpdateAcademicYearDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<AcademicYear> {
    this.assertHasChanges(input);
    const entity = await this.require(this.years, id, "Academic year");
    if (entity.status === AcademicYearStatus.CLOSED) {
      throw new ConflictException("A closed academic year cannot be edited.");
    }
    Object.assign(entity, this.cleanYearUpdate(input));
    this.assertDateRange(entity.startsOn, entity.endsOn);
    const saved = await this.saveUnique(this.years, entity);
    await this.record(
      actor,
      context,
      "academic.year.updated",
      "academic_year",
      id,
      {
        changedFields: Object.keys(input),
      },
    );
    return saved;
  }

  async activateAcademicYear(
    id: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<AcademicYear> {
    const entity = await this.require(this.years, id, "Academic year");
    if (entity.status !== AcademicYearStatus.PLANNED) {
      throw new ConflictException(
        "Only a planned academic year can be activated.",
      );
    }
    const activeYear = await this.years.findOneBy({
      status: AcademicYearStatus.ACTIVE,
    });
    if (activeYear) {
      throw new ConflictException(
        "Close the current academic year before activating another year.",
      );
    }
    entity.status = AcademicYearStatus.ACTIVE;
    const saved = await this.saveUnique(this.years, entity);
    await this.record(
      actor,
      context,
      "academic.year.activated",
      "academic_year",
      id,
    );
    return saved;
  }

  async closeAcademicYear(
    id: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<AcademicYear> {
    const entity = await this.require(this.years, id, "Academic year");
    if (entity.status !== AcademicYearStatus.ACTIVE) {
      throw new ConflictException(
        "Only an active academic year can be closed.",
      );
    }
    entity.status = AcademicYearStatus.CLOSED;
    const saved = await this.years.save(entity);
    await this.record(
      actor,
      context,
      "academic.year.closed",
      "academic_year",
      id,
    );
    return saved;
  }

  async listTerms(query: TermQueryDto): Promise<PageResult<Term>> {
    await this.require(this.years, query.academicYearId, "Academic year");
    const [items, total] = await this.terms.findAndCount({
      where: { academicYearId: query.academicYearId },
      order: { sequence: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return this.page(items, query, total);
  }

  async createTerm(
    input: CreateTermDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Term> {
    const year = await this.require(
      this.years,
      input.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    this.assertDateRange(input.startsOn, input.endsOn);
    this.assertDateWithin(input.startsOn, input.endsOn, year);
    const saved = await this.saveUnique(
      this.terms,
      this.terms.create({
        ...input,
        code: this.normalizeCode(input.code),
        name: this.requiredText(input.name, "Term name"),
      }),
    );
    await this.record(
      actor,
      context,
      "academic.term.created",
      "term",
      saved.id,
    );
    return saved;
  }

  async updateTerm(
    id: string,
    input: UpdateTermDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Term> {
    this.assertHasChanges(input);
    const entity = await this.require(this.terms, id, "Term");
    if (
      input.academicYearId &&
      input.academicYearId !== entity.academicYearId
    ) {
      throw new BadRequestException(
        "A term cannot be moved to another academic year.",
      );
    }
    const year = await this.require(
      this.years,
      entity.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    Object.assign(entity, {
      ...input,
      code:
        input.code === undefined ? entity.code : this.normalizeCode(input.code),
      name:
        input.name === undefined
          ? entity.name
          : this.requiredText(input.name, "Term name"),
    });
    this.assertDateRange(entity.startsOn, entity.endsOn);
    this.assertDateWithin(entity.startsOn, entity.endsOn, year);
    const saved = await this.saveUnique(this.terms, entity);
    await this.record(actor, context, "academic.term.updated", "term", id, {
      changedFields: Object.keys(input),
    });
    return saved;
  }

  async listClassLevels(query: PageQueryDto): Promise<PageResult<ClassLevel>> {
    const [items, total] = await this.classLevels.findAndCount({
      order: { sortOrder: "ASC", code: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return this.page(items, query, total);
  }

  async createClassLevel(
    input: CreateClassLevelDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<ClassLevel> {
    const saved = await this.saveUnique(
      this.classLevels,
      this.classLevels.create({
        ...input,
        code: this.normalizeCode(input.code),
        name: this.requiredText(input.name, "Class level name"),
        isActive: input.isActive ?? true,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.class_level.created",
      "class_level",
      saved.id,
    );
    return saved;
  }

  async updateClassLevel(
    id: string,
    input: UpdateClassLevelDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<ClassLevel> {
    this.assertHasChanges(input);
    const entity = await this.require(this.classLevels, id, "Class level");
    Object.assign(entity, {
      ...input,
      code:
        input.code === undefined ? entity.code : this.normalizeCode(input.code),
      name:
        input.name === undefined
          ? entity.name
          : this.requiredText(input.name, "Class level name"),
    });
    const saved = await this.saveUnique(this.classLevels, entity);
    await this.record(
      actor,
      context,
      "academic.class_level.updated",
      "class_level",
      id,
      {
        changedFields: Object.keys(input),
      },
    );
    return saved;
  }

  async listSections(query: SectionQueryDto): Promise<PageResult<Section>> {
    const where = {
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.classLevelId ? { classLevelId: query.classLevelId } : {}),
    };
    const [items, total] = await this.sections.findAndCount({
      where,
      relations: { classLevel: true },
      order: { academicYearId: "DESC", classLevelId: "ASC", code: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return this.page(items, query, total);
  }

  async createSection(
    input: CreateSectionDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Section> {
    const year = await this.require(
      this.years,
      input.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    const classLevel = await this.require(
      this.classLevels,
      input.classLevelId,
      "Class level",
    );
    if (!classLevel.isActive)
      throw new ConflictException("The class level is inactive.");
    const saved = await this.saveUnique(
      this.sections,
      this.sections.create({
        ...input,
        code: this.normalizeCode(input.code),
        name: this.requiredText(input.name, "Section name"),
        capacity: input.capacity ?? null,
        isActive: true,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.section.created",
      "section",
      saved.id,
    );
    return saved;
  }

  async updateSection(
    id: string,
    input: UpdateSectionDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Section> {
    this.assertHasChanges(input);
    const entity = await this.require(this.sections, id, "Section");
    const year = await this.require(
      this.years,
      entity.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    if (
      (input.academicYearId &&
        input.academicYearId !== entity.academicYearId) ||
      (input.classLevelId && input.classLevelId !== entity.classLevelId)
    ) {
      throw new BadRequestException(
        "A section cannot be moved to another academic year or class level.",
      );
    }
    Object.assign(entity, {
      code:
        input.code === undefined ? entity.code : this.normalizeCode(input.code),
      name:
        input.name === undefined
          ? entity.name
          : this.requiredText(input.name, "Section name"),
      capacity: input.capacity === undefined ? entity.capacity : input.capacity,
      isActive: input.isActive ?? entity.isActive,
    });
    const saved = await this.saveUnique(this.sections, entity);
    await this.record(
      actor,
      context,
      "academic.section.updated",
      "section",
      id,
      {
        changedFields: Object.keys(input),
      },
    );
    return saved;
  }

  async listSubjects(query: PageQueryDto): Promise<PageResult<Subject>> {
    const [items, total] = await this.subjects.findAndCount({
      order: { code: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return this.page(items, query, total);
  }

  async createSubject(
    input: CreateSubjectDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Subject> {
    const saved = await this.saveUnique(
      this.subjects,
      this.subjects.create({
        ...input,
        code: this.normalizeCode(input.code),
        name: this.requiredText(input.name, "Subject name"),
        isActive: input.isActive ?? true,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.subject.created",
      "subject",
      saved.id,
    );
    return saved;
  }

  async updateSubject(
    id: string,
    input: UpdateSubjectDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Subject> {
    this.assertHasChanges(input);
    const entity = await this.require(this.subjects, id, "Subject");
    Object.assign(entity, {
      ...input,
      code:
        input.code === undefined ? entity.code : this.normalizeCode(input.code),
      name:
        input.name === undefined
          ? entity.name
          : this.requiredText(input.name, "Subject name"),
    });
    const saved = await this.saveUnique(this.subjects, entity);
    await this.record(
      actor,
      context,
      "academic.subject.updated",
      "subject",
      id,
      {
        changedFields: Object.keys(input),
      },
    );
    return saved;
  }

  async listClassSubjects(
    academicYearId: string,
    classLevelId: string,
  ): Promise<ClassSubject[]> {
    await this.require(this.years, academicYearId, "Academic year");
    await this.require(this.classLevels, classLevelId, "Class level");
    return this.classSubjects.find({
      where: { academicYearId, classLevelId },
      relations: { subject: true },
      order: { sequence: "ASC", subjectId: "ASC" },
    });
  }

  async addClassSubject(
    academicYearId: string,
    classLevelId: string,
    input: CreateClassSubjectDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<ClassSubject> {
    const year = await this.require(
      this.years,
      academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    const classLevel = await this.require(
      this.classLevels,
      classLevelId,
      "Class level",
    );
    if (!classLevel.isActive)
      throw new ConflictException("The class level is inactive.");
    const subject = await this.require(
      this.subjects,
      input.subjectId,
      "Subject",
    );
    if (!subject.isActive)
      throw new ConflictException("The subject is inactive.");
    const saved = await this.saveUnique(
      this.classSubjects,
      this.classSubjects.create({
        academicYearId,
        classLevelId,
        subjectId: input.subjectId,
        isRequired: input.isRequired ?? true,
        sequence: input.sequence ?? null,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.class_subject.added",
      "class_subject",
      saved.id,
    );
    return this.classSubjects.findOneOrFail({
      where: { id: saved.id },
      relations: { subject: true },
    });
  }

  async listSectionSubjects(sectionId: string): Promise<SectionSubject[]> {
    await this.require(this.sections, sectionId, "Section");
    return this.sectionSubjects.find({
      where: { sectionId },
      relations: { classSubject: { subject: true } },
      order: { classLevelId: "ASC" },
    });
  }

  async addSectionSubject(
    sectionId: string,
    input: AddSectionSubjectDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<SectionSubject> {
    const section = await this.require(this.sections, sectionId, "Section");
    const year = await this.require(
      this.years,
      section.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    const curriculum = await this.require(
      this.classSubjects,
      input.classSubjectId,
      "Class subject",
    );
    if (
      curriculum.academicYearId !== section.academicYearId ||
      curriculum.classLevelId !== section.classLevelId
    ) {
      throw new BadRequestException(
        "The subject is not configured for this section's year and class level.",
      );
    }
    const saved = await this.saveUnique(
      this.sectionSubjects,
      this.sectionSubjects.create({
        sectionId,
        classSubjectId: curriculum.id,
        academicYearId: section.academicYearId,
        classLevelId: section.classLevelId,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.section_subject.added",
      "section_subject",
      saved.id,
    );
    return this.sectionSubjects.findOneOrFail({
      where: { id: saved.id },
      relations: { classSubject: { subject: true } },
    });
  }

  async listTeacherAssignments(
    query: TeacherAssignmentQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PageResult<TeacherAssignment>> {
    const teacherUserId = this.assignmentTeacherFilter(
      query.teacherUserId,
      actor,
    );
    const qb = this.teacherAssignments
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.teacher", "teacher")
      .leftJoinAndSelect("assignment.sectionSubject", "sectionSubject")
      .leftJoinAndSelect("sectionSubject.section", "section")
      .leftJoin("section.academicYear", "academicYear")
      .leftJoinAndSelect("sectionSubject.classSubject", "classSubject")
      .leftJoinAndSelect("classSubject.subject", "subject")
      .orderBy("assignment.startsOn", "DESC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (teacherUserId)
      qb.andWhere("assignment.teacherUserId = :teacherUserId", {
        teacherUserId,
      });
    if (query.academicYearId) {
      qb.andWhere("section.academicYearId = :academicYearId", {
        academicYearId: query.academicYearId,
      });
    }
    if (!actor.permissions.includes(Permission.ACADEMIC_WRITE)) {
      qb.andWhere("assignment.startsOn <= CURRENT_DATE")
        .andWhere(
          "(assignment.endsOn IS NULL OR assignment.endsOn >= CURRENT_DATE)",
        )
        .andWhere("academicYear.status = :activeStatus", {
          activeStatus: AcademicYearStatus.ACTIVE,
        });
    }
    const [items, total] = await qb.getManyAndCount();
    return this.page(items, query, total);
  }

  async createTeacherAssignment(
    input: CreateTeacherAssignmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<TeacherAssignment> {
    this.assertDateRange(input.startsOn, input.endsOn ?? null);
    const offering = await this.sectionSubjects.findOne({
      where: { id: input.sectionSubjectId },
      relations: { section: true },
    });
    if (!offering)
      throw new NotFoundException("Section subject was not found.");
    const year = await this.require(
      this.years,
      offering.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    this.assertDateWithin(input.startsOn, input.endsOn ?? input.startsOn, year);
    await this.requireTeacher(input.teacherUserId);
    const saved = await this.saveUnique(
      this.teacherAssignments,
      this.teacherAssignments.create({
        sectionSubjectId: input.sectionSubjectId,
        teacherUserId: input.teacherUserId,
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.teacher_assignment.created",
      "teacher_assignment",
      saved.id,
    );
    return saved;
  }

  async endTeacherAssignment(
    id: string,
    input: EndAssignmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<TeacherAssignment> {
    const assignment = await this.teacherAssignments.findOne({
      where: { id },
      relations: { sectionSubject: true },
    });
    if (!assignment) {
      throw new NotFoundException("Teacher assignment was not found.");
    }
    const year = await this.require(
      this.years,
      assignment.sectionSubject.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    this.assertAssignmentEndDate(input.endsOn, assignment.startsOn, year);
    if (assignment.endsOn) {
      throw new ConflictException("This teacher assignment has already ended.");
    }
    assignment.endsOn = input.endsOn;
    const saved = await this.teacherAssignments.save(assignment);
    await this.record(
      actor,
      context,
      "academic.teacher_assignment.ended",
      "teacher_assignment",
      id,
    );
    return saved;
  }

  async listClassTeacherAssignments(
    query: TeacherAssignmentQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PageResult<ClassTeacherAssignment>> {
    const teacherUserId = this.assignmentTeacherFilter(
      query.teacherUserId,
      actor,
    );
    const qb = this.classTeacherAssignments
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.teacher", "teacher")
      .leftJoinAndSelect("assignment.section", "section")
      .leftJoin("section.academicYear", "academicYear")
      .orderBy("assignment.startsOn", "DESC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (teacherUserId)
      qb.andWhere("assignment.teacherUserId = :teacherUserId", {
        teacherUserId,
      });
    if (query.academicYearId) {
      qb.andWhere("section.academicYearId = :academicYearId", {
        academicYearId: query.academicYearId,
      });
    }
    if (!actor.permissions.includes(Permission.ACADEMIC_WRITE)) {
      qb.andWhere("assignment.startsOn <= CURRENT_DATE")
        .andWhere(
          "(assignment.endsOn IS NULL OR assignment.endsOn >= CURRENT_DATE)",
        )
        .andWhere("academicYear.status = :activeStatus", {
          activeStatus: AcademicYearStatus.ACTIVE,
        });
    }
    const [items, total] = await qb.getManyAndCount();
    return this.page(items, query, total);
  }

  async createClassTeacherAssignment(
    input: CreateClassTeacherAssignmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<ClassTeacherAssignment> {
    this.assertDateRange(input.startsOn, input.endsOn ?? null);
    const section = await this.require(
      this.sections,
      input.sectionId,
      "Section",
    );
    const year = await this.require(
      this.years,
      section.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    this.assertDateWithin(input.startsOn, input.endsOn ?? input.startsOn, year);
    await this.requireTeacher(input.teacherUserId);
    const saved = await this.saveUnique(
      this.classTeacherAssignments,
      this.classTeacherAssignments.create({
        sectionId: input.sectionId,
        teacherUserId: input.teacherUserId,
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
        reason: input.reason?.trim() || null,
      }),
    );
    await this.record(
      actor,
      context,
      "academic.class_teacher_assignment.created",
      "class_teacher_assignment",
      saved.id,
    );
    return saved;
  }

  async endClassTeacherAssignment(
    id: string,
    input: EndAssignmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<ClassTeacherAssignment> {
    const assignment = await this.classTeacherAssignments.findOne({
      where: { id },
      relations: { section: true },
    });
    if (!assignment) {
      throw new NotFoundException("Class-teacher assignment was not found.");
    }
    const year = await this.require(
      this.years,
      assignment.section.academicYearId,
      "Academic year",
    );
    this.assertYearEditable(year);
    this.assertAssignmentEndDate(input.endsOn, assignment.startsOn, year);
    if (assignment.endsOn) {
      throw new ConflictException(
        "This class-teacher assignment has already ended.",
      );
    }
    assignment.endsOn = input.endsOn;
    const saved = await this.classTeacherAssignments.save(assignment);
    await this.record(
      actor,
      context,
      "academic.class_teacher_assignment.ended",
      "class_teacher_assignment",
      id,
    );
    return saved;
  }

  private assignmentTeacherFilter(
    requestedTeacherId: string | undefined,
    actor: AuthenticatedUser,
  ): string | undefined {
    const canReadAll = actor.permissions.includes(Permission.ACADEMIC_WRITE);
    if (requestedTeacherId && !canReadAll && requestedTeacherId !== actor.id) {
      throw new ForbiddenException(
        "You may only view your own teaching assignments.",
      );
    }
    return canReadAll ? requestedTeacherId : actor.id;
  }

  private async requireTeacher(userId: string): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        "The selected teacher account is not active.",
      );
    }
    const hasTeacherRole = await this.roleAssignments.exist({
      where: { userId, role: UserRole.TEACHER },
    });
    if (!hasTeacherRole) {
      throw new BadRequestException(
        "The selected account does not have the teacher role.",
      );
    }
    return user;
  }

  private cleanYearUpdate(input: UpdateAcademicYearDto): Partial<AcademicYear> {
    return {
      ...input,
      code:
        input.code === undefined ? undefined : this.normalizeCode(input.code),
      name:
        input.name === undefined
          ? undefined
          : this.requiredText(input.name, "Academic year name"),
    };
  }

  private assertYearEditable(year: AcademicYear): void {
    if (year.status === AcademicYearStatus.CLOSED) {
      throw new ConflictException("A closed academic year cannot be changed.");
    }
  }

  private assertDateRange(
    startsOn: string,
    endsOn: string | null | undefined,
  ): void {
    if (endsOn && endsOn < startsOn) {
      throw new BadRequestException(
        "The end date must be on or after the start date.",
      );
    }
  }

  private assertDateWithin(
    startsOn: string,
    endsOn: string | null | undefined,
    year: AcademicYear,
  ): void {
    const finalDate = endsOn ?? startsOn;
    if (startsOn < year.startsOn || finalDate > year.endsOn) {
      throw new BadRequestException(
        "Dates must fall within the academic year.",
      );
    }
  }

  private assertAssignmentEndDate(
    endsOn: string,
    startsOn: string,
    year: AcademicYear,
  ): void {
    if (endsOn < startsOn || endsOn < year.startsOn || endsOn > year.endsOn) {
      throw new BadRequestException(
        "The assignment end date must fall within its academic year and not precede its start date.",
      );
    }
  }

  private normalizeCode(value: string): string {
    return this.requiredText(value, "Code").toUpperCase();
  }

  private requiredText(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${label} cannot be blank.`);
    return normalized;
  }

  private assertHasChanges(input: object): void {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException("Provide at least one field to update.");
    }
  }

  private page<T>(
    items: T[],
    query: PageQueryDto,
    total: number,
  ): PageResult<T> {
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  private async require<T extends { id: string }>(
    repository: Repository<T>,
    id: string,
    name: string,
  ): Promise<T> {
    const entity = await repository.findOneBy({ id } as never);
    if (!entity) throw new NotFoundException(`${name} was not found.`);
    return entity;
  }

  private async saveUnique<T extends object>(
    repository: Repository<T>,
    entity: T,
  ): Promise<T> {
    try {
      return await repository.save(entity);
    } catch (error) {
      const code = (error as { driverError?: { code?: string } })?.driverError
        ?.code;
      if (code === "23505" || code === "23P01") {
        throw new ConflictException(
          "The requested academic record conflicts with an existing record.",
        );
      }
      if (code === "23503") {
        throw new BadRequestException(
          "A referenced academic record does not exist.",
        );
      }
      throw error;
    }
  }

  private async record(
    actor: AuthenticatedUser,
    context: AuditRequestContext,
    action: string,
    entityName: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.recordEvent({
      actorId: actor.id,
      actorRole: actor.roles.join(","),
      action,
      entityName,
      entityId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
      metadata,
    });
  }
}
