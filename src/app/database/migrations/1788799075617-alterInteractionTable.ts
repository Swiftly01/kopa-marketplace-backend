import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterInteractionTable1788799075617 implements MigrationInterface {
  name = 'AlterInteractionTable1788799075617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ADD "review_request_attempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ADD "review_request_last_attempt_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" DROP COLUMN "review_request_last_attempt_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" DROP COLUMN "review_request_attempts"`,
    );
  }
}
