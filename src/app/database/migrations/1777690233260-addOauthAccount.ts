import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOauthAccount1777690233260 implements MigrationInterface {
  name = 'AddOauthAccount1777690233260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."oauth_accounts_provider_enum" AS ENUM('google', 'apple', 'github')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."oauth_accounts_provider_enum" NOT NULL, "provider_id" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "profile_picture" text, "user_id" uuid NOT NULL, "last_login_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710a81523f515b78f894e33bb10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_283c974372e384adfc2c51ae18" ON "oauth_accounts" ("provider", "provider_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN " password_reset_token_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_reset_token_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" ADD CONSTRAINT "FK_22a05e92f51a983475f9281d3b0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" DROP CONSTRAINT "FK_22a05e92f51a983475f9281d3b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_reset_token_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD " password_reset_token_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_283c974372e384adfc2c51ae18"`,
    );
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
    await queryRunner.query(
      `DROP TYPE "public"."oauth_accounts_provider_enum"`,
    );
  }
}
