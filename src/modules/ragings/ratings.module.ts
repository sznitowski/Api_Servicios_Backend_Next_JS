import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequestRating } from './request-rating.entity';
import { RatingsService } from './ratings.service';
import { ServiceRequest } from '../request/request.entity';
import { ProviderProfile } from '../providers/provider-profile.entity';
import { User } from '../users/user.entity';
import { RatingsController, RatingsWriterController } from './ratings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RequestRating, ServiceRequest, ProviderProfile, User])],
  providers: [RatingsService],
  controllers: [RatingsController, RatingsWriterController], 
  exports: [RatingsService],
})
export class RatingsModule {}
