import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersPublicController } from './providers.public.controller';
import { ProvidersService } from './providers.service';
import { ProviderProfile } from './provider-profile.entity';
import { ProviderServiceType } from './provider-service-type.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';
import { RatingsModule } from '../ragings/ratings.module'; // <- importa el módulo de ratings
import { UserAddress } from '../users/user-address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderProfile, ProviderServiceType, ServiceType, User, UserAddress]),
    RatingsModule, // <- necesario para inyectar RatingsService en el controller
  ],
  controllers: [ProvidersController, ProvidersPublicController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})


export class ProvidersModule {}
