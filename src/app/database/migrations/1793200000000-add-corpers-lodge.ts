import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCorpersLodge1793200000000 implements MigrationInterface {
  name = 'AddCorpersLodge1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // tables
    await queryRunner.query(
      `CREATE TABLE "family_houses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "fellowship" character varying(100), "address" text, "state_code" character varying(10), "state_name" character varying(100), "lga_name" character varying(100), "contact_phone" character varying(20), "description" character varying(500), "admin_user_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "REL_a74cc892d1c80c5d28237d867b0" UNIQUE ("admin_user_id"), CONSTRAINT "PK_5b101eded0df05aac9874acff25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "family_house_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicant_user_id" uuid NOT NULL, "house_name" character varying(150) NOT NULL, "fellowship" character varying(100), "address" text NOT NULL, "state_code" character varying(10) NOT NULL, "state_name" character varying(100) NOT NULL, "lga_name" character varying(100) NOT NULL, "contact_phone" character varying(20) NOT NULL, "description" character varying(500), "status" character varying(20) NOT NULL DEFAULT 'pending', "rejection_reason" character varying(300), "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "family_house_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c8a192cd1583f9d12eacad017c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "family_house_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "slug" character varying(180) NOT NULL, "fellowship" character varying(100), "address" text NOT NULL, "landmark" character varying(200), "state_code" character varying(10), "state_name" character varying(100), "lga_name" character varying(100), "maps_url" character varying(1024), "latitude" numeric(9,6), "longitude" numeric(9,6), "coordinator_name" character varying(100), "hotline" character varying(20), "whatsapp_number" character varying(20), "inventory_mode" character varying(20) NOT NULL DEFAULT 'dorm_bunk', "transit_info" jsonb, "bed_slots_enabled" boolean NOT NULL DEFAULT true, "capacity" smallint, "price_per_bed" bigint, "amenities" text array NOT NULL DEFAULT '{}', "house_rules" jsonb NOT NULL DEFAULT '[]', "pickup_enabled" boolean NOT NULL DEFAULT false, "pickup_date" date, "logistics_lead_name" character varying(100), "logistics_lead_phone" character varying(20), "status" character varying(20) NOT NULL DEFAULT 'draft', "availability" character varying(20) NOT NULL DEFAULT 'open', "published_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_5cb4094721abd09610966eb443b" UNIQUE ("slug"), CONSTRAINT "PK_ec5718f079ccec3cf11e1e13615" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "code" character varying(10) NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(200), "kind" character varying(20) NOT NULL DEFAULT 'shared', "wing" character varying(10), "features" text array NOT NULL DEFAULT '{}', "rent_contribution" bigint, "position" smallint NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c7f0915da6dd675a7b7e99fd671" UNIQUE ("lodge_id", "code"), CONSTRAINT "PK_7b8af43f25de647233f2b35d225" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_assembly_gates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(200), "marshal_name" character varying(100), "marshal_phone" character varying(20), "position" smallint NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_51924567feb7cc54fdb92bc0c2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "url" text NOT NULL, "thumbnail_url" text, "public_id" character varying(255) NOT NULL, "label" character varying(60), "is_cover" boolean NOT NULL DEFAULT false, "position" integer NOT NULL, "format" character varying(50), "size_bytes" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f16faafebda1d9ffc673b502829" UNIQUE ("public_id"), CONSTRAINT "PK_4a386a94be1ca90921701a54eac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_bed_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "room_id" uuid, "code" character varying(10) NOT NULL, "wing" character varying(10) NOT NULL, "bunk_type" character varying(10) NOT NULL, "location_note" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'available', "occupant_label" character varying(60), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f24f29e34113bd7801e40d01e95" UNIQUE ("lodge_id", "code"), CONSTRAINT "PK_7095fb692868ca4381e5db1b282" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_pickup_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "label" character varying(40) NOT NULL, "start_time" character varying(5) NOT NULL, "end_time" character varying(5) NOT NULL, "capacity" smallint NOT NULL, "gate_id" uuid, "vehicle_name" character varying(100), "driver_name" character varying(100), "driver_phone" character varying(20), "status" character varying(20) NOT NULL DEFAULT 'scheduled', "departed_at" TIMESTAMP WITH TIME ZONE, "arrived_at" TIMESTAMP WITH TIME ZONE, "trip_minutes" smallint, "vehicle_note" character varying(200), "position" smallint NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cdd8cdf9e2e647437a2c86b38cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lodge_id" uuid NOT NULL, "family_house_id" uuid NOT NULL, "corper_id" uuid, "source" character varying(10) NOT NULL DEFAULT 'self', "bed_slot_id" uuid, "pickup_batch_id" uuid, "passcode" character varying(30) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "full_name" character varying(120) NOT NULL, "call_up_number" character varying(40) NOT NULL, "whatsapp_phone" character varying(20) NOT NULL, "gender" character varying(10) NOT NULL, "lights_out_routine" character varying(60), "morning_routine" character varying(60), "pickup_gate_id" uuid, "transit_status" character varying(20) NOT NULL DEFAULT 'awaiting', "gate_arrived_at" TIMESTAMP WITH TIME ZONE, "boarded_at" TIMESTAMP WITH TIME ZONE, "arrived_at" TIMESTAMP WITH TIME ZONE, "documents_verified_at" TIMESTAMP WITH TIME ZONE, "documents_verified_by" uuid, "luggage_note" character varying(100), "welfare_need" character varying(100), "next_of_kin_name" character varying(100), "next_of_kin_relation" character varying(40), "next_of_kin_phone" character varying(20), "agreed_to_rules_at" TIMESTAMP WITH TIME ZONE NOT NULL, "rejection_reason" character varying(300), "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "checked_in_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ae8ff6856e740ea80ff615b3bb7" UNIQUE ("passcode"), CONSTRAINT "PK_3d8b5d91f7003d20c0dc3224518" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lodge_booking_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "url" text NOT NULL, "public_id" character varying(255) NOT NULL, "file_name" character varying(255) NOT NULL, "format" character varying(50), "size_bytes" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ed2ad26fc6c70d47cfe9786e472" UNIQUE ("public_id"), CONSTRAINT "PK_b4a237217e08a26335685262f35" PRIMARY KEY ("id"))`,
    );
    // indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_fc6e6f4f291c5098426b62a0e4" ON "family_house_applications" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b459346237169f4788d93b26d8" ON "family_house_applications" ("applicant_user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_family_house_applications_pending" ON "family_house_applications" ("applicant_user_id") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_390822fb0efcc422eca1c938df" ON "lodges" ("family_house_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_266dfd3f72218fbb2d26510c9d" ON "lodges" ("status", "availability", "published_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_80d4456045df3bf7ffe62007a9" ON "lodges" ("state_code", "lga_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e55522492c296fd736443aec7" ON "lodge_rooms" ("lodge_id", "position")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_05045f1150f9436ef6e64ffe98" ON "lodge_assembly_gates" ("lodge_id", "position")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e7316fa8a004381346d72cd9a1" ON "lodge_images" ("lodge_id", "position")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lodge_images_cover" ON "lodge_images" ("lodge_id") WHERE "is_cover" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e674c814a01e792c7f79b11b3" ON "lodge_bed_slots" ("lodge_id", "wing", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1aeb919191fd025eee5a05864b" ON "lodge_bed_slots" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd9006cc4397b1b414de98e5fb" ON "lodge_pickup_batches" ("lodge_id", "position")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cbb43f7bac8d7d809ba1c394c4" ON "lodge_bookings" ("family_house_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2e93eb063e62f6a4880971852" ON "lodge_bookings" ("lodge_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8bb5e862f0cf92f85adf1d0179" ON "lodge_bookings" ("corper_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_193a8ccc292a2d86f878def6de" ON "lodge_bookings" ("pickup_batch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7eee7798e8c6f210babac9e08c" ON "lodge_bookings" ("pickup_gate_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lodge_bookings_active_corper" ON "lodge_bookings" ("corper_id") WHERE "status" IN ('pending','confirmed','checked_in')`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lodge_bookings_active_bed" ON "lodge_bookings" ("bed_slot_id") WHERE "status" IN ('pending','confirmed','checked_in')`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d6262335296f5316ba41a0b464" ON "lodge_booking_documents" ("booking_id")`,
    );
    // foreign keys
    await queryRunner.query(
      `ALTER TABLE "family_houses" ADD CONSTRAINT "FK_a74cc892d1c80c5d28237d867b0" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_house_applications" ADD CONSTRAINT "FK_b459346237169f4788d93b26d84" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_house_applications" ADD CONSTRAINT "FK_f5c86ee0ab1c9b7be1c65e9d03c" FOREIGN KEY ("family_house_id") REFERENCES "family_houses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodges" ADD CONSTRAINT "FK_298c25682e7f79c18464b68e54a" FOREIGN KEY ("family_house_id") REFERENCES "family_houses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_rooms" ADD CONSTRAINT "FK_351922c3151ad2dd5fd6514f82e" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_assembly_gates" ADD CONSTRAINT "FK_5233ffa0b61ef7ff2d063a18de7" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_images" ADD CONSTRAINT "FK_c0d2515e4c38ccbd1b8d2729ba7" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bed_slots" ADD CONSTRAINT "FK_091fa78fd1f6b1b45fd4524272a" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bed_slots" ADD CONSTRAINT "FK_1aeb919191fd025eee5a05864be" FOREIGN KEY ("room_id") REFERENCES "lodge_rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_pickup_batches" ADD CONSTRAINT "FK_a9ef5ef803cb5e984654ebf4ebf" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_pickup_batches" ADD CONSTRAINT "FK_c1c4cb2eb7228b94337c514b364" FOREIGN KEY ("gate_id") REFERENCES "lodge_assembly_gates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_5a7819ada37ea163aac4c88e190" FOREIGN KEY ("lodge_id") REFERENCES "lodges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_4a3317a900942887a1adb7fbd2c" FOREIGN KEY ("family_house_id") REFERENCES "family_houses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_a7cc62cca842123745ec3c1d2e9" FOREIGN KEY ("corper_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_c5bbdccd7381c4f35ab557fe60b" FOREIGN KEY ("bed_slot_id") REFERENCES "lodge_bed_slots"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_193a8ccc292a2d86f878def6de3" FOREIGN KEY ("pickup_batch_id") REFERENCES "lodge_pickup_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" ADD CONSTRAINT "FK_7eee7798e8c6f210babac9e08c1" FOREIGN KEY ("pickup_gate_id") REFERENCES "lodge_assembly_gates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_booking_documents" ADD CONSTRAINT "FK_d6262335296f5316ba41a0b4643" FOREIGN KEY ("booking_id") REFERENCES "lodge_bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // foreign keys
    await queryRunner.query(
      `ALTER TABLE "lodge_booking_documents" DROP CONSTRAINT "FK_d6262335296f5316ba41a0b4643"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_7eee7798e8c6f210babac9e08c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_193a8ccc292a2d86f878def6de3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_c5bbdccd7381c4f35ab557fe60b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_a7cc62cca842123745ec3c1d2e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_4a3317a900942887a1adb7fbd2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bookings" DROP CONSTRAINT "FK_5a7819ada37ea163aac4c88e190"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_pickup_batches" DROP CONSTRAINT "FK_c1c4cb2eb7228b94337c514b364"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_pickup_batches" DROP CONSTRAINT "FK_a9ef5ef803cb5e984654ebf4ebf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bed_slots" DROP CONSTRAINT "FK_1aeb919191fd025eee5a05864be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_bed_slots" DROP CONSTRAINT "FK_091fa78fd1f6b1b45fd4524272a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_images" DROP CONSTRAINT "FK_c0d2515e4c38ccbd1b8d2729ba7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_assembly_gates" DROP CONSTRAINT "FK_5233ffa0b61ef7ff2d063a18de7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodge_rooms" DROP CONSTRAINT "FK_351922c3151ad2dd5fd6514f82e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lodges" DROP CONSTRAINT "FK_298c25682e7f79c18464b68e54a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_house_applications" DROP CONSTRAINT "FK_f5c86ee0ab1c9b7be1c65e9d03c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_house_applications" DROP CONSTRAINT "FK_b459346237169f4788d93b26d84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_houses" DROP CONSTRAINT "FK_a74cc892d1c80c5d28237d867b0"`,
    );
    // indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d6262335296f5316ba41a0b464"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_lodge_bookings_active_bed"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_lodge_bookings_active_corper"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7eee7798e8c6f210babac9e08c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_193a8ccc292a2d86f878def6de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bb5e862f0cf92f85adf1d0179"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2e93eb063e62f6a4880971852"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cbb43f7bac8d7d809ba1c394c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd9006cc4397b1b414de98e5fb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1aeb919191fd025eee5a05864b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e674c814a01e792c7f79b11b3"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_lodge_images_cover"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e7316fa8a004381346d72cd9a1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_05045f1150f9436ef6e64ffe98"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e55522492c296fd736443aec7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80d4456045df3bf7ffe62007a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_266dfd3f72218fbb2d26510c9d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_390822fb0efcc422eca1c938df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_family_house_applications_pending"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b459346237169f4788d93b26d8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc6e6f4f291c5098426b62a0e4"`,
    );
    // tables
    await queryRunner.query(`DROP TABLE "lodge_booking_documents"`);
    await queryRunner.query(`DROP TABLE "lodge_bookings"`);
    await queryRunner.query(`DROP TABLE "lodge_pickup_batches"`);
    await queryRunner.query(`DROP TABLE "lodge_bed_slots"`);
    await queryRunner.query(`DROP TABLE "lodge_images"`);
    await queryRunner.query(`DROP TABLE "lodge_assembly_gates"`);
    await queryRunner.query(`DROP TABLE "lodge_rooms"`);
    await queryRunner.query(`DROP TABLE "lodges"`);
    await queryRunner.query(`DROP TABLE "family_house_applications"`);
    await queryRunner.query(`DROP TABLE "family_houses"`);
  }
}
