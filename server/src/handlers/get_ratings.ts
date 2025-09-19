import { db } from '../db';
import { ratingsTable, usersTable } from '../db/schema';
import { type Rating } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getRatings = async (targetType: string, targetId: string): Promise<Rating[]> => {
  try {
    // Validate target type
    const validTargetTypes = ['shop', 'product', 'courier'];
    if (!validTargetTypes.includes(targetType)) {
      throw new Error(`Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`);
    }

    // Query ratings with user information, ordered by newest first
    const results = await db.select({
      id: ratingsTable.id,
      user_id: ratingsTable.user_id,
      target_type: ratingsTable.target_type,
      target_id: ratingsTable.target_id,
      rating: ratingsTable.rating,
      comment: ratingsTable.comment,
      created_at: ratingsTable.created_at,
      // Include user full name for display purposes
      user_full_name: usersTable.full_name
    })
      .from(ratingsTable)
      .innerJoin(usersTable, eq(ratingsTable.user_id, usersTable.id))
      .where(
        and(
          eq(ratingsTable.target_type, targetType as any),
          eq(ratingsTable.target_id, targetId)
        )
      )
      .orderBy(desc(ratingsTable.created_at))
      .execute();

    // Transform results to match Rating schema (excluding user_full_name which is extra)
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      target_type: result.target_type,
      target_id: result.target_id,
      rating: result.rating,
      comment: result.comment,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to get ratings:', error);
    throw error;
  }
};