import { db } from '../db';
import { productsTable, shopsTable, productCategoriesTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function updateProduct(input: UpdateProductInput, userId: string): Promise<Product> {
  try {
    // First verify the product exists and the user owns the shop
    const productCheck = await db.select({
      product_id: productsTable.id,
      shop_user_id: shopsTable.user_id
    })
      .from(productsTable)
      .innerJoin(shopsTable, eq(productsTable.shop_id, shopsTable.id))
      .where(eq(productsTable.id, input.id))
      .execute();

    if (productCheck.length === 0) {
      throw new Error('Product not found');
    }

    if (productCheck[0].shop_user_id !== userId) {
      throw new Error('Unauthorized: Product does not belong to your shop');
    }

    // If category_id is being updated, verify it exists
    if (input.category_id) {
      const categoryExists = await db.select()
        .from(productCategoriesTable)
        .where(eq(productCategoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error('Category not found');
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: sql`now()`
    };

    if (input.category_id !== undefined) {
      updateData['category_id'] = input.category_id;
    }
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    if (input.price !== undefined) {
      updateData['price'] = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.image_url !== undefined) {
      updateData['image_url'] = input.image_url;
    }
    if (input.quantity !== undefined) {
      updateData['quantity'] = input.quantity;
    }
    if (input.is_available !== undefined) {
      updateData['is_available'] = input.is_available;
    }

    // Update the product
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
}