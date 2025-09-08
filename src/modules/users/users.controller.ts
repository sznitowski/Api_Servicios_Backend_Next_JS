// src/modules/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ---- Perfil (sanitizado)
  @Get('me')
  me(@Req() req: any) {
    return this.service.getMe(req.user.sub);
  }

  // ---- Direcciones del usuario
  @Get('me/addresses')
  listMy(@Req() req: any) {
    return this.service.listMyAddresses(req.user.sub);
  }

  @Post('me/addresses')
  createMy(@Body() dto: CreateAddressDto, @Req() req: any) {
    return this.service.createMyAddress(req.user.sub, dto);
  }

  @Patch('me/addresses/:id')
  updateMy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @Req() req: any,
  ) {
    return this.service.updateMyAddress(req.user.sub, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteMy(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.deleteMyAddress(req.user.sub, id);
  }
}
