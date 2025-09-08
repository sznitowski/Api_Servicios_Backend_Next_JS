import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',       // 👈 tipo explícito para MySQL
    length: 255,
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;   // el runtime puede ser null; al tener type:'varchar' TypeORM no usa el "design:type"


@Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
role: UserRole;

@Column({ default: true })
active: boolean;

@CreateDateColumn()
createdAt: Date;

@UpdateDateColumn()
updatedAt: Date;
}
