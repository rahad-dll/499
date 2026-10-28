import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { InferenceSchedulerService } from './inference-scheduler.service';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  controllers: [SpacesController, SlotsController],
  providers: [SpacesService, InferenceSchedulerService, SlotsService],
})
export class SpacesModule {}
