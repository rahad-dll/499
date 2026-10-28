-- CreateEnum
CREATE TYPE "slot_status" AS ENUM ('active', 'inactive', 'maintenance', 'blocked');

-- CreateEnum
CREATE TYPE "occupancy_source" AS ENUM ('ai', 'booking', 'manual');

-- CreateEnum
CREATE TYPE "vehicle_kind" AS ENUM ('car', 'motorcycle', 'cng', 'microbus', 'suv', 'pickup');

-- CreateEnum
CREATE TYPE "rent_type" AS ENUM ('hourly', 'daily', 'monthly', 'flat');

-- CreateEnum
CREATE TYPE "discount_kind" AS ENUM ('percent', 'fixed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "slot_type" ADD VALUE 'compact';
ALTER TYPE "slot_type" ADD VALUE 'large';
ALTER TYPE "slot_type" ADD VALUE 'bicycle';

-- AlterTable
ALTER TABLE "parking_slots" ADD COLUMN     "access_note" VARCHAR(500),
ADD COLUMN     "allow_daily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_hourly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_monthly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assigned_driver_id" UUID,
ADD COLUMN     "bbox" JSONB,
ADD COLUMN     "cover_photo_key" VARCHAR(500),
ADD COLUMN     "display_name" VARCHAR(100),
ADD COLUMN     "ev_charger_kw" DOUBLE PRECISION,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "floor" VARCHAR(20),
ADD COLUMN     "is_bookable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "length_cm" INTEGER,
ADD COLUMN     "max_height_cm" INTEGER,
ADD COLUMN     "occupancy_source" "occupancy_source",
ADD COLUMN     "qr_code" VARCHAR(64),
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "slot_status" NOT NULL DEFAULT 'active',
ADD COLUMN     "vehicle_types" "vehicle_kind"[],
ADD COLUMN     "width_cm" INTEGER,
ADD COLUMN     "zone" VARCHAR(50);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "base_amount_unit" INTEGER,
ADD COLUMN     "discount_id" UUID,
ADD COLUMN     "discount_unit" INTEGER,
ADD COLUMN     "end_at" TIMESTAMPTZ(6),
ADD COLUMN     "extended_to" TIMESTAMPTZ(6),
ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "rent_type" "rent_type" NOT NULL DEFAULT 'hourly',
ADD COLUMN     "vehicle_plate" VARCHAR(20);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "zone" VARCHAR(50),
    "slot_id" UUID,
    "name" VARCHAR(100),
    "rent_type" "rent_type" NOT NULL,
    "amount_unit" INTEGER NOT NULL,
    "min_units" INTEGER NOT NULL DEFAULT 1,
    "max_units" INTEGER,
    "grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "overstay_rate_unit" INTEGER,
    "deposit_unit" INTEGER,
    "cancel_free_minutes" INTEGER,
    "cancel_fee_unit" INTEGER,
    "days" INTEGER[],
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "zone" VARCHAR(50),
    "slot_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "kind" "discount_kind" NOT NULL,
    "value" INTEGER NOT NULL,
    "applies_to" "rent_type"[],
    "min_units" INTEGER,
    "code" VARCHAR(50),
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_plans_space_id_rent_type_idx" ON "rate_plans"("space_id", "rent_type");

-- CreateIndex
CREATE INDEX "rate_plans_slot_id_idx" ON "rate_plans"("slot_id");

-- CreateIndex
CREATE INDEX "discounts_space_id_idx" ON "discounts"("space_id");

-- CreateIndex
CREATE INDEX "discounts_slot_id_idx" ON "discounts"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_space_id_code_key" ON "discounts"("space_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_slots_qr_code_key" ON "parking_slots"("qr_code");

-- CreateIndex
CREATE INDEX "parking_slots_space_id_zone_idx" ON "parking_slots"("space_id", "zone");

-- CreateIndex
CREATE INDEX "parking_slots_status_idx" ON "parking_slots"("status");

-- CreateIndex
CREATE INDEX "parking_slots_assigned_driver_id_idx" ON "parking_slots"("assigned_driver_id");

-- CreateIndex
CREATE INDEX "bookings_slot_id_scheduled_at_end_at_idx" ON "bookings"("slot_id", "scheduled_at", "end_at");

-- CreateIndex
CREATE INDEX "bookings_vehicle_plate_idx" ON "bookings"("vehicle_plate");

-- AddForeignKey
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "parking_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "parking_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: existing bookings used hold_expires_at as their end time
UPDATE "bookings" SET "end_at" = "hold_expires_at" WHERE "end_at" IS NULL;

-- Backfill: copy payment status from existing payment transactions
UPDATE "bookings" AS b SET "payment_status" = p."status"
FROM "payment_transactions" AS p
WHERE p."booking_id" = b."id";
