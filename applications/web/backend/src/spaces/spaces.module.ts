import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { InferenceSchedulerService } from './inference-scheduler.service';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  controllers: [SpacesController, SlotsController, CamerasController, RatesController],
  providers: [SpacesService, InferenceSchedulerService, SlotsService, CamerasService, RatesService],
})
export class SpacesModule {}
