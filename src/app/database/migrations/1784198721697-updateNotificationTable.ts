import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationTable1784198721697 implements MigrationInterface {
  name = 'UpdateNotificationTable1784198721697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "is_read" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "read_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "read_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "is_read"`,
    );
  }
}
