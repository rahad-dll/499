-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "frame_key" VARCHAR(500),
ADD COLUMN     "frame_uploaded_at" TIMESTAMPTZ(6);
