-- CreateEnum
CREATE TYPE "plate_check" AS ENUM ('match', 'mismatch', 'no_booking', 'unknown');

-- AlterTable
ALTER TABLE "parking_slots" ADD COLUMN     "plate_check" "plate_check";
