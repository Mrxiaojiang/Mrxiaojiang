import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum AlbumVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index(['visibility', 'like_count'])

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500, nullable: true })
  cover_url: string;

  @Column('simple-json', { default: '[]' })
  images: string[];

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'enum', enum: AlbumVisibility, default: AlbumVisibility.PRIVATE })
  visibility: AlbumVisibility;

  @Column({ default: 0 })
  like_count: number;

  @Column({ default: 0 })
  view_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
