import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Unique,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum LikeTargetType {
  POST = 'post',
  COMMENT = 'comment',
  ALBUM = 'album',
}

@Entity('like_records')
@Unique(['user_id', 'target_type', 'target_id'])
export class LikeRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: LikeTargetType })
  target_type: LikeTargetType;

  @Column()
  target_id: string;

  @CreateDateColumn()
  created_at: Date;
}
