import { db } from '../db';
import { shopsTable, usersTable } from '../db/schema';
import { type Shop } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getShops = async (): Promise<Shop[]> => {
  try {
    // Fetch all active shops with their associated user information
    const results = await db.select()
      .from(shopsTable)
      .innerJoin(usersTable, eq(shopsTable.user_id, usersTable.id))
      .where(
        and(
          eq(shopsTable.is_active, true),
          eq(usersTable.is_active, true)
        )
      )
      .execute();

    // Map the results to match the Shop schema
    return results.map(result => ({
      id: result.shops.id,
      user_id: result.shops.user_id,
      name: result.shops.name,
      description: result.shops.description,
      address: result.shops.address,
      phone: result.shops.phone,
      image_url: result.shops.image_url,
      is_active: result.shops.is_active,
      rating: result.shops.rating,
      created_at: result.shops.created_at,
      updated_at: result.shops.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch shops:', error);
    throw error;
  }
};