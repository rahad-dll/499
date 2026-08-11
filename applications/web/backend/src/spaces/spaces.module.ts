import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { InferenceSchedulerService } from './inference-scheduler.service';

@Module({
  controllers: [SpacesController],
  providers: [SpacesService, InferenceSchedulerService],
})
export class SpacesModule {}
