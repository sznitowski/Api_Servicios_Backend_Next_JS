import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column, Unique } from 'typeorm';
import { Category } from './category.entity';

@Entity('category_translations')
@Unique(['category', 'locale'])
export class CategoryTranslation {
  @PrimaryColumn({ name: 'category_id', type: 'int' })
  categoryId: number;

  @PrimaryColumn({ length: 8 })
  locale: string; // 'es', 'en', 'pt-BR'

  @ManyToOne(() => Category, c => c.serviceTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
