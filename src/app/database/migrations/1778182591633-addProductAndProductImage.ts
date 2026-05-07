import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAndProductImage1778182591633 implements MigrationInterface {
  name = 'AddProductAndProductImage1778182591633';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_e40a1dd2909378f0da1f34f7bd6"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sellerId"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe"`,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD "sellerId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_e40a1dd2909378f0da1f34f7bd6" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
