import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: { email: string; name: string; password: string; role?: UserRole }) {
    return this.service.create(body);
  }
}
