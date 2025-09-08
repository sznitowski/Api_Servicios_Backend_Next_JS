import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user.entity';

export class UserDoc {
  @ApiProperty() id: number;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() active: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}
