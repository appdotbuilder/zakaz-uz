import { db } from '../db';
import { shopsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Shop } from '../schema';

export const getShopById = async (shopId: string): Promise<Shop | null> => {
  try {
    // Fetch shop by ID
    const shops = await db.select()
      .from(shopsTable)
      .where(eq(shopsTable.id, shopId))
      .execute();

    if (shops.length === 0) {
      return null;
    }

    const shop = shops[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...shop,
      rating: shop.rating // rating is already a number (real type)
    };
  } catch (error) {
    console.error('Shop retrieval failed:', error);
    throw error;
  }
};