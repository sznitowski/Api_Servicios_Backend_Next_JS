import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RatingsController,
  RatingsWriterController,
  RatingsReadController,
} from './ratings.controller';
import { RatingsService } from './ratings.service';
import { RequestRating } from './request-rating.entity';
import { ServiceRequest } from '../request/request.entity';
import { ProviderProfile } from '../providers/provider-profile.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RequestRating, ServiceRequest, ProviderProfile, User])],
  controllers: [RatingsController, RatingsWriterController, RatingsReadController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
