import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Permission, UserRole } from "@schoolerp/contracts";
import {
  Brackets,
  DataSource,
  EntityManager,
  IsNull,
  Repository,
} from "typeorm";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { AuthenticatedUser } from "../auth/auth.types";
import { RoleAssignment } from "../auth/entities/role-assignment.entity";
import { User, UserStatus } from "../auth/entities/user.entity";
import { Guardian } from "./entities/guardian.entity";
import {
  AcademicYear,
  AcademicYearStatus,
} from "./entities/academic-year.entity";
import { Enrollment, EnrollmentStatus } from "./entities/enrollment.entity";
import { EnrollmentPlacement } from "./entities/enrollment-placement.entity";
import { Section } from "./entities/section.entity";
import { Student, StudentStatus } from "./entities/student.entity";
import { StudentGuardian } from "./entities/student-guardian.entity";
import { AuditRequestContext, PageResult } from "./academic.service";
import {
  CloseEnrollmentDto,
  CreateAndLinkGuardianDto,
  CreateEnrollmentDto,
  CreatePlacementDto,
  CreateStudentDto,
  PromoteStudentsDto,
  StudentQueryDto,
  LinkPersonAccountDto,
  UpdateStudentGuardianDto,
  UpdateStudentDto,
} from "./dto/academic.dto";

const BROAD_STUDENT_ROLES = new Set<UserRole>([
  UserRole.OWNER,
  UserRole.PRINCIPAL,
  UserRole.ADMIN,
  UserRole.ADMISSIONS_OFFICER,
]);
const PROMOTION_ROLES = new Set<UserRole>([
  UserRole.OWNER,
  UserRole.PRINCIPAL,
  UserRole.ADMIN,
]);

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Guardian)
    private readonly guardians: Repository<Guardian>,
    @InjectRepository(StudentGuardian)
    private readonly studentGuardians: Repository<StudentGuardian>,
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(EnrollmentPlacement)
    private readonly placements: Repository<EnrollmentPlacement>,
    @InjectRepository(AcademicYear)
    private readonly years: Repository<AcademicYear>,
    @InjectRepository(Section)
    private readonly sections: Repository<Section>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: StudentQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PageResult<Record<string, unknown>>> {
    const qb = this.scopedStudentQuery(actor);
    if (query.academicYearId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "enrollments" filter_enrollment
          WHERE filter_enrollment."studentId" = student.id
            AND filter_enrollment."academicYearId" = :academicYearId
        )`,
        { academicYearId: query.academicYearId },
      );
    }
    if (query.sectionId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM "enrollments" section_enrollment
          JOIN "enrollment_placements" section_placement
            ON section_placement."enrollmentId" = section_enrollment."id"
          WHERE section_enrollment."studentId" = student."id"
            AND section_placement."sectionId" = :sectionId
        )`,
        { sectionId: query.sectionId },
      );
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%`;
      qb.andWhere(
        `(
          student."studentNumber" ILIKE :search
          OR student."firstName" ILIKE :search
          OR student."lastName" ILIKE :search
        )`,
        { search },
      );
    }
    qb.orderBy("student.lastName", "ASC")
      .addOrderBy("student.firstName", "ASC")
      .addOrderBy("student.id", "ASC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((student) => this.studentSummary(student, actor)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const student = await this.scopedStudentQuery(actor)
      .andWhere("student.id = :studentId", { studentId: id })
      .getOne();
    if (!student) throw new NotFoundException("Student was not found.");
    return this.studentSummary(student, actor, true);
  }

  async archiveStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const student = await this.dataSource.transaction(async (manager) => {
      const studentRepository = manager.getRepository(Student);
      const student = await studentRepository.findOne({
        where: { id: studentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!student) throw new NotFoundException("Student was not found.");
      if (student.status === StudentStatus.ARCHIVED) {
        throw new ConflictException("Student is already archived.");
      }
      const activeEnrollment = await manager.getRepository(Enrollment).exist({
        where: { studentId, status: EnrollmentStatus.ENROLLED },
      });
      if (activeEnrollment) {
        throw new ConflictException(
          "Close the student's active enrollment before archiving the record.",
        );
      }
      student.status = StudentStatus.ARCHIVED;
      const saved = await studentRepository.save(student);
      await this.recordAuditWithManager(
        manager,
        actor,
        context,
        "student.archived",
        "student",
        studentId,
      );
      return saved;
    });
    return this.studentSummary(student, actor, true);
  }

  async reactivateStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const student = await this.dataSource.transaction(async (manager) => {
      const studentRepository = manager.getRepository(Student);
      const student = await studentRepository.findOne({
        where: { id: studentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!student) throw new NotFoundException("Student was not found.");
      if (student.status !== StudentStatus.ARCHIVED) {
        throw new ConflictException("Student is not archived.");
      }
      student.status = StudentStatus.ACTIVE;
      const saved = await studentRepository.save(student);
      await this.recordAuditWithManager(
        manager,
        actor,
        context,
        "student.reactivated",
        "student",
        studentId,
      );
      return saved;
    });
    return this.studentSummary(student, actor, true);
  }

  async promoteStudents(
    input: PromoteStudentsDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<{
    total: number;
    promoted: number;
    alreadyPromoted: number;
    failed: number;
    results: Array<Record<string, unknown>>;
  }> {
    if (!actor.roles.some((role) => PROMOTION_ROLES.has(role))) {
      throw new ForbiddenException(
        "Only an owner, principal, or administrator can promote students.",
      );
    }
    if (input.sourceAcademicYearId === input.targetAcademicYearId) {
      throw new BadRequestException(
        "Choose different source and target academic years.",
      );
    }

    const seenStudentIds = new Set<string>();
    const results: Array<Record<string, unknown>> = [];
    for (const entry of input.students) {
      if (seenStudentIds.has(entry.studentId)) {
        results.push({
          studentId: entry.studentId,
          status: "FAILED",
          message: "A student can appear only once in a promotion batch.",
        });
        continue;
      }
      seenStudentIds.add(entry.studentId);
      try {
        const result = await this.dataSource
          .transaction(async (manager) => {
            const studentRepository = manager.getRepository(Student);
            const student = await studentRepository.findOne({
              where: { id: entry.studentId },
              lock: { mode: "pessimistic_write" },
            });
            if (!student) {
              throw new NotFoundException("Student was not found.");
            }
            if (student.status !== StudentStatus.ACTIVE) {
              throw new ConflictException(
                "Archived students cannot be promoted.",
              );
            }

            const yearRepository = manager.getRepository(AcademicYear);
            const sourceYear = await yearRepository.findOneBy({
              id: input.sourceAcademicYearId,
            });
            const targetYear = await yearRepository.findOneBy({
              id: input.targetAcademicYearId,
            });
            if (!sourceYear || !targetYear) {
              throw new NotFoundException("Academic year was not found.");
            }
            if (
              sourceYear.status !== AcademicYearStatus.CLOSED ||
              targetYear.status === AcademicYearStatus.CLOSED ||
              targetYear.startsOn <= sourceYear.startsOn
            ) {
              throw new BadRequestException(
                "Promotion requires a closed source year and a later, open target year.",
              );
            }
            this.assertDateInside(input.enrollmentDate, targetYear);

            const enrollmentRepository = manager.getRepository(Enrollment);
            const targetEnrollment = await enrollmentRepository.findOne({
              where: {
                studentId: student.id,
                academicYearId: targetYear.id,
              },
              relations: { placements: true },
              lock: { mode: "pessimistic_write" },
            });
            if (targetEnrollment) {
              const currentPlacement = targetEnrollment.placements.find(
                (placement) => placement.endsOn === null,
              );
              if (
                targetEnrollment.status === EnrollmentStatus.ENROLLED &&
                targetEnrollment.enrollmentDate === input.enrollmentDate &&
                currentPlacement?.sectionId === entry.sectionId
              ) {
                return {
                  studentId: student.id,
                  enrollmentId: targetEnrollment.id,
                  status: "ALREADY_PROMOTED",
                };
              }
              throw new ConflictException(
                "The student already has a different enrollment in the target year.",
              );
            }

            const sourceEnrollment = await enrollmentRepository.findOne({
              where: {
                studentId: student.id,
                academicYearId: sourceYear.id,
              },
              lock: { mode: "pessimistic_write" },
            });
            if (!sourceEnrollment) {
              throw new BadRequestException(
                "The student has no enrollment in the source year.",
              );
            }
            if (sourceEnrollment.status !== EnrollmentStatus.COMPLETED) {
              throw new ConflictException(
                "Complete the source-year enrollment before promotion.",
              );
            }

            const section = await manager.getRepository(Section).findOne({
              where: { id: entry.sectionId },
              lock: { mode: "pessimistic_write" },
            });
            if (
              !section ||
              !section.isActive ||
              section.academicYearId !== targetYear.id
            ) {
              throw new BadRequestException(
                "Choose an active section in the target academic year.",
              );
            }
            await this.assertSectionCapacity(manager, section);

            const enrollment = await enrollmentRepository.save(
              enrollmentRepository.create({
                studentId: student.id,
                academicYearId: targetYear.id,
                status: EnrollmentStatus.ENROLLED,
                enrollmentDate: input.enrollmentDate,
                exitDate: null,
              }),
            );
            await manager.getRepository(EnrollmentPlacement).save({
              enrollmentId: enrollment.id,
              academicYearId: targetYear.id,
              sectionId: section.id,
              startsOn: input.enrollmentDate,
              endsOn: null,
              reason: "Annual promotion",
            });
            await this.recordAuditWithManager(
              manager,
              actor,
              context,
              "student.promoted",
              "enrollment",
              enrollment.id,
              {
                sourceAcademicYearId: sourceYear.id,
                targetAcademicYearId: targetYear.id,
                sectionId: section.id,
              },
            );
            return {
              studentId: student.id,
              enrollmentId: enrollment.id,
              status: "PROMOTED",
            };
          })
          .catch((error: unknown) => this.mapStudentWriteError(error));
        results.push(result);
      } catch (error) {
        results.push({
          studentId: entry.studentId,
          status: "FAILED",
          message:
            error instanceof Error
              ? error.message
              : "The promotion could not be completed.",
        });
      }
    }

    const promoted = results.filter(
      (item) => item.status === "PROMOTED",
    ).length;
    const alreadyPromoted = results.filter(
      (item) => item.status === "ALREADY_PROMOTED",
    ).length;
    return {
      total: results.length,
      promoted,
      alreadyPromoted,
      failed: results.length - promoted - alreadyPromoted,
      results,
    };
  }

  async listEnrollments(
    studentId: string,
    actor: AuthenticatedUser,
  ): Promise<Enrollment[]> {
    const accessibleStudent = await this.scopedStudentQuery(actor)
      .andWhere("student.id = :studentId", { studentId })
      .getOne();
    if (!accessibleStudent) {
      throw new NotFoundException("Student was not found.");
    }

    const query = this.enrollments
      .createQueryBuilder("enrollment")
      .leftJoinAndSelect("enrollment.academicYear", "academicYear")
      .leftJoinAndSelect("enrollment.placements", "placement")
      .leftJoinAndSelect("placement.section", "section")
      .where("enrollment.studentId = :studentId", { studentId })
      .orderBy("academicYear.startsOn", "DESC")
      .addOrderBy("placement.startsOn", "DESC");

    if (
      actor.roles.includes(UserRole.TEACHER) &&
      !actor.roles.some((role) => BROAD_STUDENT_ROLES.has(role))
    ) {
      query
        .andWhere("enrollment.status = :enrolled", {
          enrolled: EnrollmentStatus.ENROLLED,
        })
        .andWhere("academicYear.status = :active", {
          active: AcademicYearStatus.ACTIVE,
        });
    }
    return query.getMany();
  }

  async create(
    input: CreateStudentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const temporaryFamilyPassword =
      input.familyPortal?.action === "CREATE"
        ? randomBytes(24).toString("base64url")
        : undefined;
    const familyPasswordHash = temporaryFamilyPassword
      ? await argon2.hash(temporaryFamilyPassword, {
          type: argon2.argon2id,
          memoryCost: 19_456,
          timeCost: 2,
          parallelism: 1,
        })
      : undefined;
    const saved = await this.dataSource
      .transaction(async (manager) => {
        const student = await manager.getRepository(Student).save({
          studentNumber: this.requiredText(
            input.studentNumber,
            "Student number",
          ).toUpperCase(),
          firstName: this.requiredText(input.firstName, "First name"),
          lastName: this.requiredText(input.lastName, "Last name"),
          dateOfBirth: input.dateOfBirth ?? null,
          status: StudentStatus.ACTIVE,
          userId: null,
        });
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.created",
          "student",
          student.id,
        );
        let familyPortalAccount:
          { email: string; temporaryPassword?: string } | undefined;
        if (input.familyPortal?.action === "LINK_EXISTING") {
          const portal = input.familyPortal;
          const user = await manager.getRepository(User).findOne({
            where: { id: portal.userId },
            relations: { roleAssignments: true },
          });
          if (
            !user ||
            user.status !== UserStatus.ACTIVE ||
            !user.roleAssignments.some(
              (assignment) => assignment.role === UserRole.PARENT,
            )
          ) {
            throw new BadRequestException(
              "Choose an active parent portal account.",
            );
          }
          const guardian = await manager.getRepository(Guardian).findOne({
            where: { userId: user.id },
          });
          if (!guardian) {
            throw new BadRequestException(
              "This account is not linked to a guardian record yet.",
            );
          }
          await manager.getRepository(StudentGuardian).save(
            manager.getRepository(StudentGuardian).create({
              studentId: student.id,
              guardianId: guardian.id,
              relationship: portal.relationship.trim(),
              isPrimaryContact: true,
            }),
          );
          await this.recordAuditWithManager(
            manager,
            actor,
            context,
            "student.guardian.linked",
            "guardian",
            guardian.id,
            { studentId: student.id, isPrimaryContact: true },
          );
          familyPortalAccount = { email: user.email };
        } else if (
          input.familyPortal?.action === "CREATE" &&
          familyPasswordHash
        ) {
          const portal = input.familyPortal;
          const email = portal.email.trim().toLowerCase();
          const userRepository = manager.getRepository(User);
          const user = await userRepository.save(
            userRepository.create({
              email,
              displayName: `${this.requiredText(portal.guardianFirstName, "Guardian first name")} ${this.requiredText(portal.guardianLastName, "Guardian last name")}`,
              passwordHash: familyPasswordHash,
              status: UserStatus.ACTIVE,
              mustChangePassword: true,
            }),
          );
          await manager.getRepository(RoleAssignment).save(
            manager.getRepository(RoleAssignment).create({
              userId: user.id,
              role: UserRole.PARENT,
            }),
          );
          const guardianRepository = manager.getRepository(Guardian);
          const guardian = await guardianRepository.save(
            guardianRepository.create({
              firstName: portal.guardianFirstName.trim(),
              lastName: portal.guardianLastName.trim(),
              email,
              phone: portal.phone?.trim() || null,
              userId: user.id,
            }),
          );
          await manager.getRepository(StudentGuardian).save(
            manager.getRepository(StudentGuardian).create({
              studentId: student.id,
              guardianId: guardian.id,
              relationship: portal.relationship.trim(),
              isPrimaryContact: true,
            }),
          );
          await this.recordAuditWithManager(
            manager,
            actor,
            context,
            "auth.family_portal.created",
            "user",
            user.id,
            { role: UserRole.PARENT, studentId: student.id },
          );
          await this.recordAuditWithManager(
            manager,
            actor,
            context,
            "student.guardian.linked",
            "guardian",
            guardian.id,
            { studentId: student.id, isPrimaryContact: true },
          );
          familyPortalAccount = {
            email: user.email,
            temporaryPassword: temporaryFamilyPassword,
          };
        }
        return { student, familyPortalAccount };
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return {
      ...this.studentSummary(saved.student, actor, true),
      ...(saved.familyPortalAccount
        ? { familyPortal: saved.familyPortalAccount }
        : {}),
    };
  }

  async listFamilyPortalAccounts(): Promise<Record<string, unknown>[]> {
    const guardians = await this.guardians
      .createQueryBuilder("guardian")
      .innerJoinAndSelect("guardian.user", "user")
      .innerJoin(
        "user.roleAssignments",
        "roleAssignment",
        "roleAssignment.role = :role",
        {
          role: UserRole.PARENT,
        },
      )
      .select([
        "guardian.id",
        "guardian.userId",
        "guardian.firstName",
        "guardian.lastName",
        "user.id",
        "user.email",
        "user.displayName",
      ])
      .where("user.status = :status", { status: UserStatus.ACTIVE })
      .orderBy("user.displayName", "ASC")
      .getMany();

    return guardians.map((guardian) => ({
      guardianId: guardian.id,
      userId: guardian.userId,
      displayName:
        guardian.user?.displayName ??
        `${guardian.firstName} ${guardian.lastName}`,
      email: guardian.user?.email ?? guardian.email,
    }));
  }

  async update(
    id: string,
    input: UpdateStudentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        "Provide at least one student field to update.",
      );
    }
    const saved = await this.dataSource
      .transaction(async (manager) => {
        const repository = manager.getRepository(Student);
        const student = await repository.findOne({
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        if (!student) throw new NotFoundException("Student was not found.");
        Object.assign(student, {
          firstName:
            input.firstName === undefined
              ? student.firstName
              : this.requiredText(input.firstName, "First name"),
          lastName:
            input.lastName === undefined
              ? student.lastName
              : this.requiredText(input.lastName, "Last name"),
          dateOfBirth:
            input.dateOfBirth === undefined
              ? student.dateOfBirth
              : input.dateOfBirth,
        });
        const updated = await repository.save(student);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.updated",
          "student",
          id,
          { changedFields: Object.keys(input) },
        );
        return updated;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return this.studentSummary(saved, actor, true);
  }

  async listGuardians(
    studentId: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>[]> {
    const student = await this.students.findOneBy({ id: studentId });
    if (!student) throw new NotFoundException("Student was not found.");
    const links = await this.studentGuardians.find({
      where: { studentId },
      relations: { guardian: true },
      order: { isPrimaryContact: "DESC", createdAt: "ASC" },
    });
    await this.dataSource.getRepository(AuditEvent).save({
      actorId: actor.id,
      actorRole: actor.roles.join(","),
      action: "student.guardians.viewed",
      entityName: "student",
      entityId: studentId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
      metadata: null,
    });
    return links.map((link) => ({
      id: link.guardian.id,
      linkId: link.id,
      firstName: link.guardian.firstName,
      lastName: link.guardian.lastName,
      email: link.guardian.email,
      phone: link.guardian.phone,
      relationship: link.relationship,
      isPrimaryContact: link.isPrimaryContact,
      endedAt: link.endedAt,
      hasPortalAccount: link.guardian.userId !== null,
    }));
  }

  async updateGuardianLink(
    studentId: string,
    linkId: string,
    input: UpdateStudentGuardianDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    if (
      input.relationship === undefined &&
      input.isPrimaryContact === undefined
    ) {
      throw new BadRequestException("Provide a relationship change.");
    }
    const updated = await this.dataSource
      .transaction(async (manager) => {
        const student = await manager.getRepository(Student).findOne({
          where: { id: studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!student) throw new NotFoundException("Student was not found.");
        const linkRepository = manager.getRepository(StudentGuardian);
        const link = await linkRepository.findOne({
          where: { id: linkId, studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!link) {
          throw new NotFoundException("Guardian relationship was not found.");
        }
        if (link.endedAt) {
          throw new ConflictException(
            "An ended guardian relationship cannot be edited.",
          );
        }
        if (input.relationship !== undefined) {
          link.relationship = this.requiredText(
            input.relationship,
            "Relationship",
          );
        }
        let replacedPrimaryLinkIds: string[] = [];
        if (input.isPrimaryContact === true) {
          replacedPrimaryLinkIds = await this.clearActivePrimaryGuardian(
            manager,
            studentId,
          );
        }
        if (input.isPrimaryContact !== undefined) {
          link.isPrimaryContact = input.isPrimaryContact;
        }
        const saved = await linkRepository.save(link);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.guardian.relationship_updated",
          "student_guardian",
          saved.id,
          {
            studentId,
            relationshipChanged: input.relationship !== undefined,
            primaryContactChanged: input.isPrimaryContact !== undefined,
            replacedPrimaryLinkIds,
          },
        );
        return saved;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return {
      linkId: updated.id,
      guardianId: updated.guardianId,
      relationship: updated.relationship,
      isPrimaryContact: updated.isPrimaryContact,
      endedAt: updated.endedAt,
    };
  }

  async endGuardianLink(
    studentId: string,
    linkId: string,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const ended = await this.dataSource
      .transaction(async (manager) => {
        const student = await manager.getRepository(Student).findOne({
          where: { id: studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!student) throw new NotFoundException("Student was not found.");
        const linkRepository = manager.getRepository(StudentGuardian);
        const link = await linkRepository.findOne({
          where: { id: linkId, studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!link) {
          throw new NotFoundException("Guardian relationship was not found.");
        }
        if (link.endedAt) {
          throw new ConflictException(
            "This guardian relationship has already ended.",
          );
        }
        link.endedAt = new Date();
        const saved = await linkRepository.save(link);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.guardian.relationship_ended",
          "student_guardian",
          saved.id,
          { studentId },
        );
        return saved;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return {
      linkId: ended.id,
      endedAt: ended.endedAt,
    };
  }

  async linkStudentAccount(
    studentId: string,
    input: LinkPersonAccountDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const saved = await this.dataSource
      .transaction(async (manager) => {
        const studentRepository = manager.getRepository(Student);
        const student = await studentRepository.findOne({
          where: { id: studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!student) throw new NotFoundException("Student was not found.");
        if (student.userId) {
          throw new ConflictException(
            "This student already has a linked account.",
          );
        }
        await this.requireLinkedAccount(
          input.userId,
          UserRole.STUDENT,
          manager,
        );
        student.userId = input.userId;
        const linked = await studentRepository.save(student);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.account.linked",
          "student",
          studentId,
        );
        return linked;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return { id: saved.id, hasPortalAccount: true };
  }

  async linkGuardianAccount(
    guardianId: string,
    input: LinkPersonAccountDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const guardian = await this.dataSource
      .transaction(async (manager) => {
        const guardianRepository = manager.getRepository(Guardian);
        const entity = await guardianRepository.findOne({
          where: { id: guardianId },
          lock: { mode: "pessimistic_write" },
        });
        if (!entity) throw new NotFoundException("Guardian was not found.");
        if (entity.userId) {
          throw new ConflictException(
            "This guardian already has a linked account.",
          );
        }
        await this.requireLinkedAccount(input.userId, UserRole.PARENT, manager);
        entity.userId = input.userId;
        await guardianRepository.save(entity);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "guardian.account.linked",
          "guardian",
          guardianId,
        );
        return entity;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return { id: guardian.id, hasPortalAccount: true };
  }

  async createAndLinkGuardian(
    studentId: string,
    input: CreateAndLinkGuardianDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Record<string, unknown>> {
    const student = await this.students.findOneBy({ id: studentId });
    if (!student || student.status !== StudentStatus.ACTIVE) {
      throw new NotFoundException("Active student was not found.");
    }
    const savedLink = await this.dataSource
      .transaction(async (manager) => {
        const currentStudent = await manager.getRepository(Student).findOne({
          where: { id: studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!currentStudent || currentStudent.status !== StudentStatus.ACTIVE) {
          throw new NotFoundException("Active student was not found.");
        }
        const guardian = await manager.getRepository(Guardian).save(
          manager.getRepository(Guardian).create({
            firstName: this.requiredText(
              input.firstName,
              "Guardian first name",
            ),
            lastName: this.requiredText(input.lastName, "Guardian last name"),
            email: input.email?.trim().toLowerCase() || null,
            phone: input.phone?.trim() || null,
            userId: null,
          }),
        );
        const replacedPrimaryLinkIds = input.isPrimaryContact
          ? await this.clearActivePrimaryGuardian(manager, studentId)
          : [];
        const link = await manager.getRepository(StudentGuardian).save(
          manager.getRepository(StudentGuardian).create({
            studentId,
            guardianId: guardian.id,
            relationship: this.requiredText(input.relationship, "Relationship"),
            isPrimaryContact: input.isPrimaryContact ?? false,
          }),
        );
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.guardian.linked",
          "student_guardian",
          link.id,
          replacedPrimaryLinkIds.length
            ? { studentId, replacedPrimaryLinkIds }
            : undefined,
        );
        return { guardian, link };
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return {
      id: savedLink.guardian.id,
      firstName: savedLink.guardian.firstName,
      lastName: savedLink.guardian.lastName,
      email: savedLink.guardian.email,
      phone: savedLink.guardian.phone,
      relationship: savedLink.link.relationship,
      isPrimaryContact: savedLink.link.isPrimaryContact,
    };
  }

  async createEnrollment(
    studentId: string,
    input: CreateEnrollmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Enrollment> {
    const student = await this.students.findOneBy({ id: studentId });
    if (!student || student.status !== StudentStatus.ACTIVE) {
      throw new NotFoundException("Active student was not found.");
    }
    const year = await this.years.findOneBy({ id: input.academicYearId });
    if (!year || year.status === AcademicYearStatus.CLOSED) {
      throw new BadRequestException(
        "The selected academic year is unavailable.",
      );
    }
    this.assertDateInside(input.enrollmentDate, year);
    const section = await this.sections.findOneBy({ id: input.sectionId });
    if (!section || section.academicYearId !== year.id || !section.isActive) {
      throw new BadRequestException(
        "The selected section is not active in the selected academic year.",
      );
    }

    const enrollment = await this.dataSource
      .transaction(async (manager) => {
        const lockedStudent = await manager.getRepository(Student).findOne({
          where: { id: studentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!lockedStudent || lockedStudent.status !== StudentStatus.ACTIVE) {
          throw new NotFoundException("Active student was not found.");
        }
        const lockedSection = await manager.getRepository(Section).findOne({
          where: { id: section.id },
          lock: { mode: "pessimistic_write" },
        });
        if (!lockedSection || !lockedSection.isActive) {
          throw new BadRequestException("The selected section is not active.");
        }
        await this.assertSectionCapacity(manager, lockedSection);
        const enrollmentRepository = manager.getRepository(Enrollment);
        const created = await enrollmentRepository.save(
          enrollmentRepository.create({
            studentId,
            academicYearId: year.id,
            status: EnrollmentStatus.ENROLLED,
            enrollmentDate: input.enrollmentDate,
            exitDate: null,
          }),
        );
        await manager.getRepository(EnrollmentPlacement).save({
          enrollmentId: created.id,
          academicYearId: year.id,
          sectionId: section.id,
          startsOn: input.enrollmentDate,
          endsOn: null,
          reason: "Initial enrollment",
        });
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.enrollment.created",
          "enrollment",
          created.id,
        );
        return created;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
    return enrollment;
  }

  async addPlacement(
    enrollmentId: string,
    input: CreatePlacementDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<EnrollmentPlacement> {
    return this.dataSource
      .transaction(async (manager) => {
        const enrollmentRepository = manager.getRepository(Enrollment);
        const enrollment = await enrollmentRepository.findOne({
          where: { id: enrollmentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!enrollment || enrollment.status !== EnrollmentStatus.ENROLLED) {
          throw new NotFoundException("Active enrollment was not found.");
        }
        const sectionRepository = manager.getRepository(Section);
        const section = await sectionRepository.findOne({
          where: { id: input.sectionId },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !section ||
          !section.isActive ||
          section.academicYearId !== enrollment.academicYearId
        ) {
          throw new BadRequestException(
            "The selected section is not active in this enrollment's academic year.",
          );
        }
        const year = await manager.getRepository(AcademicYear).findOneBy({
          id: enrollment.academicYearId,
        });
        if (!year || year.status === AcademicYearStatus.CLOSED) {
          throw new ConflictException(
            "Placements cannot change in a closed academic year.",
          );
        }
        this.assertDateInside(input.startsOn, year);
        await this.assertSectionCapacity(manager, section, enrollmentId);

        const placementRepository = manager.getRepository(EnrollmentPlacement);
        const current = await placementRepository.findOne({
          where: { enrollmentId, endsOn: IsNull() },
          lock: { mode: "pessimistic_write" },
        });
        if (!current || input.startsOn <= current.startsOn) {
          throw new ConflictException(
            "A placement change must start after the current placement begins.",
          );
        }
        current.endsOn = this.previousDate(input.startsOn);
        await placementRepository.save(current);
        const created = await placementRepository.save(
          placementRepository.create({
            enrollmentId,
            academicYearId: enrollment.academicYearId,
            sectionId: section.id,
            startsOn: input.startsOn,
            endsOn: null,
            reason: input.reason?.trim() || null,
          }),
        );
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.enrollment.placement_changed",
          "enrollment_placement",
          created.id,
          { enrollmentId, previousPlacementId: current.id },
        );
        return created;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
  }

  async closeEnrollment(
    enrollmentId: string,
    input: CloseEnrollmentDto,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
  ): Promise<Enrollment> {
    return this.dataSource
      .transaction(async (manager) => {
        const repo = manager.getRepository(Enrollment);
        const enrollment = await repo.findOne({
          where: { id: enrollmentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!enrollment || enrollment.status !== EnrollmentStatus.ENROLLED) {
          throw new NotFoundException("Active enrollment was not found.");
        }
        if (input.exitDate < enrollment.enrollmentDate) {
          throw new BadRequestException(
            "Exit date cannot precede enrollment date.",
          );
        }
        const year = await manager.getRepository(AcademicYear).findOneBy({
          id: enrollment.academicYearId,
        });
        if (!year) throw new NotFoundException("Academic year was not found.");
        this.assertDateInside(input.exitDate, year);
        const current = await manager
          .getRepository(EnrollmentPlacement)
          .findOne({
            where: { enrollmentId, endsOn: IsNull() },
            lock: { mode: "pessimistic_write" },
          });
        if (current) {
          if (input.exitDate < current.startsOn) {
            throw new BadRequestException(
              "Exit date cannot precede the current placement.",
            );
          }
          current.endsOn = input.exitDate;
          await manager.getRepository(EnrollmentPlacement).save(current);
        }
        enrollment.status = input.status as EnrollmentStatus;
        enrollment.exitDate = input.exitDate;
        const saved = await repo.save(enrollment);
        await this.recordAuditWithManager(
          manager,
          actor,
          context,
          "student.enrollment.closed",
          "enrollment",
          enrollmentId,
          { status: input.status },
        );
        return saved;
      })
      .catch((error: unknown) => this.mapStudentWriteError(error));
  }

  private scopedStudentQuery(actor: AuthenticatedUser) {
    const query = this.students.createQueryBuilder("student");
    if (actor.roles.some((role) => BROAD_STUDENT_ROLES.has(role))) return query;

    const scopes: string[] = [];
    if (actor.roles.includes(UserRole.TEACHER)) {
      scopes.push(`EXISTS (
        SELECT 1
        FROM "enrollments" e
        JOIN "enrollment_placements" ep ON ep."enrollmentId" = e."id"
        JOIN "academic_years" ay
          ON ay."id" = e."academicYearId" AND ay."status" = 'ACTIVE'
        WHERE e."studentId" = student."id"
          AND e."status" = 'ENROLLED'
          AND ep."startsOn" <= CURRENT_DATE
          AND (ep."endsOn" IS NULL OR ep."endsOn" >= CURRENT_DATE)
          AND (
            EXISTS (
              SELECT 1
              FROM "class_teacher_assignments" cta
              WHERE cta."sectionId" = ep."sectionId"
                AND cta."teacherUserId" = :scopeUserId
                AND cta."startsOn" <= CURRENT_DATE
                AND (cta."endsOn" IS NULL OR cta."endsOn" >= CURRENT_DATE)
            )
            OR EXISTS (
              SELECT 1
              FROM "teacher_assignments" ta
              JOIN "section_subjects" ss ON ss."id" = ta."sectionSubjectId"
              WHERE ss."sectionId" = ep."sectionId"
                AND ta."teacherUserId" = :scopeUserId
                AND ta."startsOn" <= CURRENT_DATE
                AND (ta."endsOn" IS NULL OR ta."endsOn" >= CURRENT_DATE)
            )
          )
      )`);
    }
    if (actor.roles.includes(UserRole.PARENT)) {
      scopes.push(`EXISTS (
        SELECT 1
        FROM "student_guardians" sg
        JOIN "guardians" g ON g."id" = sg."guardianId"
        WHERE sg."studentId" = student."id"
          AND sg."endedAt" IS NULL
          AND g."userId" = :scopeUserId
      )`);
    }
    if (actor.roles.includes(UserRole.STUDENT)) {
      scopes.push('student."userId" = :scopeUserId');
    }

    if (scopes.length === 0) return query.andWhere("1 = 0");
    return query
      .andWhere(
        new Brackets((scoped) => {
          scopes.forEach((condition, index) => {
            if (index === 0) scoped.where(condition);
            else scoped.orWhere(condition);
          });
        }),
      )
      .setParameter("scopeUserId", actor.id);
  }

  private studentSummary(
    student: Student,
    actor: AuthenticatedUser,
    includeDateOfBirth = false,
  ): Record<string, unknown> {
    return {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      status: student.status,
      ...(includeDateOfBirth &&
      actor.permissions.includes(Permission.STUDENT_WRITE)
        ? { dateOfBirth: student.dateOfBirth }
        : {}),
    };
  }

  private async assertSectionCapacity(
    manager: EntityManager,
    section: Section,
    excludeEnrollmentId?: string,
  ): Promise<void> {
    if (section.capacity === null) return;
    const query = manager
      .getRepository(EnrollmentPlacement)
      .createQueryBuilder("placement")
      .innerJoin("placement.enrollment", "enrollment")
      .where("placement.sectionId = :sectionId", { sectionId: section.id })
      .andWhere('placement."endsOn" IS NULL')
      .andWhere("enrollment.status = :status", {
        status: EnrollmentStatus.ENROLLED,
      });
    if (excludeEnrollmentId) {
      query.andWhere("placement.enrollmentId != :excludeEnrollmentId", {
        excludeEnrollmentId,
      });
    }
    const count = await query.getCount();
    if (count >= section.capacity) {
      throw new ConflictException(
        "The selected section has reached its capacity.",
      );
    }
  }

  private async clearActivePrimaryGuardian(
    manager: EntityManager,
    studentId: string,
  ): Promise<string[]> {
    const repository = manager.getRepository(StudentGuardian);
    const currentPrimaryLinks = await repository.find({
      where: {
        studentId,
        endedAt: IsNull(),
        isPrimaryContact: true,
      },
      lock: { mode: "pessimistic_write" },
    });
    if (!currentPrimaryLinks.length) return [];
    await repository.update(
      {
        studentId,
        endedAt: IsNull(),
        isPrimaryContact: true,
      },
      { isPrimaryContact: false },
    );
    return currentPrimaryLinks.map((link) => link.id);
  }

  private async requireLinkedAccount(
    userId: string,
    requiredRole: UserRole,
    manager: EntityManager,
  ): Promise<User> {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: "pessimistic_read" },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException("The selected account is not active.");
    }
    const hasRole = await manager.getRepository(RoleAssignment).exist({
      where: { userId, role: requiredRole },
    });
    if (!hasRole) {
      throw new BadRequestException(
        `The selected account does not have the ${requiredRole.toLowerCase()} role.`,
      );
    }
    return user;
  }

  private requiredText(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${label} cannot be blank.`);
    return normalized;
  }

  private assertDateInside(date: string, year: AcademicYear): void {
    if (date < year.startsOn || date > year.endsOn) {
      throw new BadRequestException(
        "The date must fall within the academic year.",
      );
    }
  }

  private previousDate(date: string): string {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() - 1);
    return value.toISOString().slice(0, 10);
  }

  private mapStudentWriteError(error: unknown): never {
    const driverError = (
      error as { driverError?: { code?: string; constraint?: string } }
    )?.driverError;
    const code = driverError?.code;
    if (code === "23505" || code === "23P01") {
      if (driverError?.constraint?.includes("users_email")) {
        throw new ConflictException(
          "An account with this guardian email already exists. Use a unique email or link the existing guardian account after creating the student.",
        );
      }
      throw new ConflictException(
        "The requested student, guardian, or enrollment change conflicts with an existing record.",
      );
    }
    if (code === "23503") {
      throw new BadRequestException(
        "A referenced school record does not exist.",
      );
    }
    throw error;
  }

  private async recordAuditWithManager(
    manager: EntityManager,
    actor: AuthenticatedUser,
    context: AuditRequestContext,
    action: string,
    entityName: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await manager.getRepository(AuditEvent).save({
      actorId: actor.id,
      actorRole: actor.roles.join(","),
      action,
      entityName,
      entityId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
      metadata: metadata ?? null,
    });
  }
}
