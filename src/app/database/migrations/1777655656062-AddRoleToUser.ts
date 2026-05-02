import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUser1777655656062 implements MigrationInterface {
  name = 'AddRoleToUser1777655656062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'buyer'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
