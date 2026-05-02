import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNullToExpiresAt1777658869828 implements MigrationInterface {
  name = 'AddNullToExpiresAt1777658869828';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verification_logs" ALTER COLUMN "expires_at" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verification_logs" ALTER COLUMN "expires_at" SET NOT NULL`,
    );
  }
}
