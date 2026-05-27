import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('hot_events')
export class HotEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 500, nullable: true })
  link: string;

  @Column({ length: 500, nullable: true })
  cover_image: string;

  @Column({ length: 500, nullable: true })
  summary: string;

  @Column({ default: 0 })
  sort_weight: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
