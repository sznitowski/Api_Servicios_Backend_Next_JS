import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export type Status =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

export class ListMyRequestsDto {
  @IsIn(['client', 'provider'])
  @IsOptional()
  as: 'client' | 'provider' = 'client';

  @IsOptional()
  @IsIn(['PENDING','OFFERED','ACCEPTED','IN_PROGRESS','DONE','CANCELLED'])
  status?: Status;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt() @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt() @Min(1)
  limit: number = 20;
}
