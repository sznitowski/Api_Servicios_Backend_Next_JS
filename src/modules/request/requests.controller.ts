// src/modules/request/requests.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { OfferDto, AcceptDto } from './dto/transition.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
    constructor(private readonly service: RequestsService) { }

    @Post()
    create(@Body() body: CreateRequestDto, @Req() req: any) {
        return this.service.create(body, req.user.sub);
    }

    @Get(':id')
    get(@Param('id', ParseIntPipe) id: number) {
        return this.service.get(id);
    }

    @Get(':id/timeline')
    timeline(@Param('id', ParseIntPipe) id: number) {
        return this.service.timeline(id);
    }

    @Post(':id/claim')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PROVIDER, UserRole.ADMIN)
    claim(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: OfferDto,
        @Req() req: any,
    ) {
        return this.service.claim(id, req.user.sub, body.priceOffered);
    }

    @Post(':id/accept')
    @UseGuards(RolesGuard)
    @Roles(UserRole.CLIENT, UserRole.ADMIN)
    accept(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: AcceptDto,
        @Req() req: any,
    ) {
        return this.service.accept(id, req.user.sub, body.priceAgreed);
    }

    @Post(':id/start')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PROVIDER, UserRole.ADMIN)
    start(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.service.start(id, req.user.sub);
    }

    @Post(':id/complete')
    @UseGuards(RolesGuard)
    @Roles(UserRole.PROVIDER, UserRole.ADMIN)
    complete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.service.complete(id, req.user.sub);
    }

    @Post(':id/cancel')
    cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.service.cancel(id, req.user.sub);
    }

    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post(':id/admin-cancel')
    adminCancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.service.adminCancel(id, req.user.sub);
    }
}
