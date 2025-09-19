import { db } from '../db';
import { productsTable, shopsTable, productCategoriesTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createProduct = async (input: CreateProductInput, shopId: string): Promise<Product> => {
  try {
    // Verify that the shop exists
    const shop = await db.select()
      .from(shopsTable)
      .where(eq(shopsTable.id, shopId))
      .execute();

    if (shop.length === 0) {
      throw new Error('Shop not found');
    }

    // Verify that the category exists
    const category = await db.select()
      .from(productCategoriesTable)
      .where(eq(productCategoriesTable.id, input.category_id))
      .execute();

    if (category.length === 0) {
      throw new Error('Product category not found');
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: input.category_id,
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        image_url: input.image_url,
        quantity: input.quantity,
        is_available: true,
        rating: 0
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};