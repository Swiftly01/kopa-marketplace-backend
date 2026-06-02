import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfilePictureToUsersTable1780350883479 implements MigrationInterface {
  name = 'AddProfilePictureToUsersTable1780350883479';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_picture_public_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_picture_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_picture_thumbnail_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profile_picture_thumbnail_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profile_picture_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profile_picture_public_id"`,
    );
  }
}
