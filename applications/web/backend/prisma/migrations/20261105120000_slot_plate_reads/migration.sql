-- AlterTable
ALTER TABLE "parking_slots" ADD COLUMN     "plate_confidence" DOUBLE PRECISION,
ADD COLUMN     "plate_read_at" TIMESTAMPTZ(6),
ADD COLUMN     "plate_text" VARCHAR(64);
