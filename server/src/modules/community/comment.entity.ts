import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { CommunityPost } from './community-post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  author_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Index()
  @Column()
  post_id: string;

  @ManyToOne(() => CommunityPost, (post) => post.comments)
  @JoinColumn({ name: 'post_id' })
  post: CommunityPost;

  @Index()
  @Column({ nullable: true })
  parent_id: string;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @Column({ nullable: true })
  reply_to_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0 })
  like_count: number;

  @CreateDateColumn()
  created_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
