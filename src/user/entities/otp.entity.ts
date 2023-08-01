/* eslint-disable prettier/prettier */
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './';
import { getExpiry } from 'src/common';

@Entity({ name: 'One-Time-Password' })
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  code: string;

  @Column()
  useCase: 'LOGIN' | 'D2FA' | 'PHV';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @BeforeInsert()
  setExpireDate() {
    this.expiresAt = getExpiry();
  }

  @BeforeInsert()
  setCurrentDate() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Relations
  @ManyToOne(() => User, (user) => user.otp)
  user: User;
}
