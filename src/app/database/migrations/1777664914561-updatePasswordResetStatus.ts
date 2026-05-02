import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePasswordResetStatus1777664914561 implements MigrationInterface {
  name = 'UpdatePasswordResetStatus1777664914561';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."password_reset_logs_status_enum" RENAME TO "password_reset_logs_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."password_reset_logs_status_enum" AS ENUM('pending', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" ALTER COLUMN "status" TYPE "public"."password_reset_logs_status_enum" USING "status"::"text"::"public"."password_reset_logs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."password_reset_logs_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."password_reset_logs_status_enum_old" AS ENUM('pending', 'verified', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" ALTER COLUMN "status" TYPE "public"."password_reset_logs_status_enum_old" USING "status"::"text"::"public"."password_reset_logs_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."password_reset_logs_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."password_reset_logs_status_enum_old" RENAME TO "password_reset_logs_status_enum"`,
    );
  }
}
