// src/modules/providers/providers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderProfile } from './provider-profile.entity';
import { ProviderServiceType } from './provider-service-type.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';
import { UserAddress } from '../users/user-address.entity';
import { RatingsModule } from '../ragings/ratings.module'; // ojo con el path

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderProfile,
      ProviderServiceType,
      ServiceType,
      User,
      UserAddress,
    ]),
    RatingsModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
