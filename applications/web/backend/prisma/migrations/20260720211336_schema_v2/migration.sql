/*
  Warnings:

  - You are about to drop the column `jurisdiction` on the `authority_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `driver_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `area` on the `parking_spaces` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `parking_spaces` table. All the data in the column will be lost.
  - You are about to drop the column `division` on the `parking_spaces` table. All the data in the column will be lost.
  - You are about to drop the column `thana` on the `parking_spaces` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "licence_type" AS ENUM ('professional', 'non_professional');

-- CreateEnum
CREATE TYPE "vehicle_class" AS ENUM ('H', 'M', 'L', 'C', 'T', 'P', 'X');

-- DropIndex
DROP INDEX "parking_spaces_area_idx";

-- DropIndex
DROP INDEX "parking_spaces_district_idx";

-- DropIndex
DROP INDEX "parking_spaces_division_idx";

-- DropIndex
DROP INDEX "parking_spaces_thana_idx";

-- AlterTable
ALTER TABLE "authority_profiles" DROP COLUMN "jurisdiction",
ADD COLUMN     "area_id" UUID;

-- AlterTable
ALTER TABLE "driver_profiles" DROP COLUMN "full_name",
ADD COLUMN     "area_id" UUID,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "driving_licence_no" VARCHAR(50),
ADD COLUMN     "licence_type" "licence_type",
ADD COLUMN     "vehicle_classes" "vehicle_class"[];

-- AlterTable
ALTER TABLE "owner_profiles" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "passport_no" VARCHAR(50);

-- AlterTable
ALTER TABLE "parking_spaces" DROP COLUMN "area",
DROP COLUMN "district",
DROP COLUMN "division",
DROP COLUMN "thana",
ADD COLUMN     "area_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "full_name" VARCHAR(255),
ADD COLUMN     "password_reset_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "password_reset_token" VARCHAR(255);

-- CreateTable
CREATE TABLE "divisions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "division_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thanas" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "district_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "thanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "thana_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "divisions_name_key" ON "divisions"("name");

-- CreateIndex
CREATE INDEX "districts_division_id_idx" ON "districts"("division_id");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_division_id_key" ON "districts"("name", "division_id");

-- CreateIndex
CREATE INDEX "thanas_district_id_idx" ON "thanas"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "thanas_name_district_id_key" ON "thanas"("name", "district_id");

-- CreateIndex
CREATE INDEX "areas_thana_id_idx" ON "areas"("thana_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_thana_id_key" ON "areas"("name", "thana_id");

-- CreateIndex
CREATE INDEX "authority_profiles_area_id_idx" ON "authority_profiles"("area_id");

-- CreateIndex
CREATE INDEX "driver_profiles_area_id_idx" ON "driver_profiles"("area_id");

-- CreateIndex
CREATE INDEX "owner_profiles_area_id_idx" ON "owner_profiles"("area_id");

-- CreateIndex
CREATE INDEX "parking_spaces_area_id_idx" ON "parking_spaces"("area_id");

-- CreateIndex
CREATE INDEX "users_area_id_idx" ON "users"("area_id");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanas" ADD CONSTRAINT "thanas_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_thana_id_fkey" FOREIGN KEY ("thana_id") REFERENCES "thanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_profiles" ADD CONSTRAINT "authority_profiles_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
