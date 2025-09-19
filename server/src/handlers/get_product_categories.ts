import { db } from '../db';
import { productCategoriesTable } from '../db/schema';
import { type ProductCategory } from '../schema';
import { asc } from 'drizzle-orm';

export async function getProductCategories(): Promise<ProductCategory[]> {
  try {
    // Fetch all product categories ordered by name
    const results = await db.select()
      .from(productCategoriesTable)
      .orderBy(asc(productCategoriesTable.name))
      .execute();

    // Return the categories (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch product categories:', error);
    throw error;
  }
}