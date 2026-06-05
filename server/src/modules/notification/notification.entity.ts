import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum NotificationType {
  COMMENT = 'comment',
  REPLY = 'reply',
  LIKE = 'like',
}

export enum NotificationTargetType {
  POST = 'post',
  COMMENT = 'comment',
  ALBUM = 'album',
  PLAN = 'plan',
  SUGGESTION = 'suggestion',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id', 'is_read'])
  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  actor_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  target_type: NotificationTargetType;

  @Column()
  target_id: string;

  @Column({ length: 500, nullable: true })
  content: string;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
