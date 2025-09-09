// src/app.testing.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './app.module';
import { User, UserRole } from './modules/users/user.entity';

@Module({
  imports: [
    // ✅ Config global para que JwtModule.registerAsync pueda inyectar ConfigService
    ConfigModule.forRoot({ isGlobal: true }),

    // DB en memoria para e2e
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      autoLoadEntities: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([User]),

    // Tu app real (controladores, guards, etc.)
    AppModule,
  ],
})
export class AppTestingModule implements OnModuleInit {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async onModuleInit() {
    if (await this.users.count()) return;

    const hash = await bcrypt.hash('123456', 10);
    await this.users.save(
      this.users.create({
        email: 'test@demo.com',
        name: 'Test',
        password: hash,
        role: UserRole.CLIENT,
        active: true,
      }),
    );
  }
}
