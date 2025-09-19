import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getProducts(shopId?: string, categoryId?: string): Promise<Product[]> {
  try {
    // Build query step by step to avoid TypeScript issues
    const baseQuery = db.select().from(productsTable);
    
    let finalQuery;

    if (shopId && categoryId) {
      finalQuery = baseQuery.where(and(
        eq(productsTable.shop_id, shopId),
        eq(productsTable.category_id, categoryId)
      ));
    } else if (shopId) {
      finalQuery = baseQuery.where(eq(productsTable.shop_id, shopId));
    } else if (categoryId) {
      finalQuery = baseQuery.where(eq(productsTable.category_id, categoryId));
    } else {
      finalQuery = baseQuery;
    }

    const results = await finalQuery.execute();

    // Convert numeric fields to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert numeric string to number
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}