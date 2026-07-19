import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTable1783958377499 implements MigrationInterface {
  name = 'AddNotificationTable1783958377499';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "channel" character varying NOT NULL, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "priority" integer NOT NULL DEFAULT '3', "title" character varying(255), "body" text, "data" jsonb, "idempotency_key" character varying(255) NOT NULL, "provider_message_id" character varying, "provider_name" character varying, "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "scheduled_for" TIMESTAMP, "sent_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b2a869cea88f2c53e42f70e5e5" ON "notifications" ("idempotency_key", "channel") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92f5d3a7779be163cbea7916c6" ON "notifications" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_310667f935698fcd8cb319113a" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "channel" character varying NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL DEFAULT 'Africa/Lagos', "quiet_hours_start" character varying, "quiet_hours_end" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_acf369619023c5a9d1e0e07ff1" ON "notification_preferences" ("user_id", "channel") `,
    );
    await queryRunner.query(
      `CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" text NOT NULL, "platform" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_977e24c520c49436d08e5eeea8" ON "device_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17e1f528b993c6d55def4cf5be" ON "device_tokens" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17e1f528b993c6d55def4cf5be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_977e24c520c49436d08e5eeea8"`,
    );
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_acf369619023c5a9d1e0e07ff1"`,
    );
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_310667f935698fcd8cb319113a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92f5d3a7779be163cbea7916c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2a869cea88f2c53e42f70e5e5"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
