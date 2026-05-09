import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOtpLogsTable1778262453971 implements MigrationInterface {
  name = 'CreateOtpLogsTable1778262453971';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for OTP type
    await queryRunner.query(`
      CREATE TYPE "public"."otp_logs_type_enum" AS ENUM(
        'email_verification',
        'password_reset'
      )
    `);

    // Create enum for delivery channel
    await queryRunner.query(`
      CREATE TYPE "public"."otp_logs_delivery_channel_enum" AS ENUM(
        'email',
        'sms'
      )
    `);

    // Create otp_logs table
    await queryRunner.query(`
      CREATE TABLE "otp_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."otp_logs_type_enum" NOT NULL,
        "delivery_channel" "public"."otp_logs_delivery_channel_enum" NOT NULL DEFAULT 'email',
        "recipient" character varying(255) NOT NULL,
        "ip_address" character varying(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_logs_id" PRIMARY KEY ("id")
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_logs_user_created"
      ON "otp_logs" ("user_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_otp_logs_user_type"
      ON "otp_logs" ("user_id", "type")
    `);

    // Foreign key
    await queryRunner.query(`
      ALTER TABLE "otp_logs"
      ADD CONSTRAINT "FK_otp_logs_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "otp_logs"
      DROP CONSTRAINT "FK_otp_logs_user"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "public"."IDX_otp_logs_user_type"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_otp_logs_user_created"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE "otp_logs"
    `);

    // Drop enums
    await queryRunner.query(`
      DROP TYPE "public"."otp_logs_delivery_channel_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."otp_logs_type_enum"
    `);
  }
}
