import { db } from '../db';
import { shopsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateShopInput, type Shop } from '../schema';

export async function createShop(input: CreateShopInput, userId: string): Promise<Shop> {
  try {
    // First verify that the user exists and has the 'shop' role
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    if (user.role !== 'shop') {
      throw new Error('User does not have shop role');
    }

    // Check if user already has a shop
    const existingShops = await db.select()
      .from(shopsTable)
      .where(eq(shopsTable.user_id, userId))
      .execute();

    if (existingShops.length > 0) {
      throw new Error('User already has a shop');
    }

    // Create the shop
    const result = await db.insert(shopsTable)
      .values({
        user_id: userId,
        name: input.name,
        description: input.description,
        address: input.address,
        phone: input.phone,
        image_url: input.image_url
        // is_active, rating, created_at, updated_at have defaults
      })
      .returning()
      .execute();

    const shop = result[0];
    return {
      ...shop,
      // No numeric conversions needed for shops table
      rating: shop.rating // Already a number from real type
    };
  } catch (error) {
    console.error('Shop creation failed:', error);
    throw error;
  }
}