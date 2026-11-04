-- CreateEnum
CREATE TYPE "camera_source" AS ENUM ('rtsp', 'video');


ALTER TYPE "vehicle_kind" ADD VALUE 'bicycle';
ALTER TYPE "vehicle_kind" ADD VALUE 'truck';

-- AlterTable
ALTER TABLE "rate_plans" ADD COLUMN     "vehicle_type" "vehicle_kind";

-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "frame_height" INTEGER,
ADD COLUMN     "frame_width" INTEGER,
ADD COLUMN     "media_key" VARCHAR(500),
ADD COLUMN     "media_size" INTEGER,
ADD COLUMN     "media_type" VARCHAR(100),
ADD COLUMN     "media_uploaded_at" TIMESTAMPTZ(6),
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source_type" "camera_source" NOT NULL DEFAULT 'rtsp',
ALTER COLUMN "rtsp_url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "rate_plans_space_id_vehicle_type_idx" ON "rate_plans"("space_id", "vehicle_type");
