import { db } from '../db';
import { ratingsTable, ordersTable, productsTable, shopsTable, usersTable, orderItemsTable } from '../db/schema';
import { type CreateRatingInput, type Rating } from '../schema';
import { eq, and, avg, sql, SQL } from 'drizzle-orm';

export async function createRating(input: CreateRatingInput, userId: string): Promise<Rating> {
  try {
    // Validate that the target entity exists
    await validateTargetExists(input.target_type, input.target_id);

    // Validate that the user has interacted with the target
    await validateUserInteraction(userId, input.target_type, input.target_id);

    // Check if user has already rated this target
    const existingRating = await db.select()
      .from(ratingsTable)
      .where(and(
        eq(ratingsTable.user_id, userId),
        eq(ratingsTable.target_type, input.target_type),
        eq(ratingsTable.target_id, input.target_id)
      ))
      .execute();

    if (existingRating.length > 0) {
      throw new Error('Siz bu obyektni allaqachon baholagansiz');
    }

    // Insert the rating
    const result = await db.insert(ratingsTable)
      .values({
        user_id: userId,
        target_type: input.target_type,
        target_id: input.target_id,
        rating: input.rating,
        comment: input.comment
      })
      .returning()
      .execute();

    // Update the average rating for the target entity
    await updateTargetRating(input.target_type, input.target_id);

    return result[0];
  } catch (error) {
    console.error('Rating creation failed:', error);
    throw error;
  }
}

async function validateTargetExists(targetType: string, targetId: string): Promise<void> {
  let query;
  
  switch (targetType) {
    case 'shop':
      query = db.select({ id: shopsTable.id })
        .from(shopsTable)
        .where(eq(shopsTable.id, targetId));
      break;
    case 'product':
      query = db.select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.id, targetId));
      break;
    case 'courier':
      query = db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(
          eq(usersTable.id, targetId),
          eq(usersTable.role, 'courier')
        ));
      break;
    default:
      throw new Error('Noto\'g\'ri target turi');
  }

  const result = await query.execute();
  if (result.length === 0) {
    throw new Error(`${targetType} topilmadi`);
  }
}

async function validateUserInteraction(userId: string, targetType: string, targetId: string): Promise<void> {
  let query;

  switch (targetType) {
    case 'shop':
      // Check if user has ordered from this shop
      query = db.select({ id: ordersTable.id })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.customer_id, userId),
          eq(ordersTable.shop_id, targetId),
          eq(ordersTable.status, 'delivered')
        ));
      break;
    case 'product':
      // Check if user has ordered this product
      query = db.select({ id: orderItemsTable.id })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
        .where(and(
          eq(ordersTable.customer_id, userId),
          eq(orderItemsTable.product_id, targetId),
          eq(ordersTable.status, 'delivered')
        ));
      break;
    case 'courier':
      // Check if user has had orders delivered by this courier
      query = db.select({ id: ordersTable.id })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.customer_id, userId),
          eq(ordersTable.courier_id, targetId),
          eq(ordersTable.status, 'delivered')
        ));
      break;
    default:
      throw new Error('Noto\'g\'ri target turi');
  }

  const result = await query.execute();
  if (result.length === 0) {
    throw new Error('Siz bu obyekt bilan hali o\'zaro aloqada bo\'lmagansiz');
  }
}

async function updateTargetRating(targetType: string, targetId: string): Promise<void> {
  // Calculate average rating for the target
  const avgRatingResult = await db.select({
    avgRating: avg(ratingsTable.rating)
  })
    .from(ratingsTable)
    .where(and(
      eq(ratingsTable.target_type, targetType as 'shop' | 'product' | 'courier'),
      eq(ratingsTable.target_id, targetId)
    ))
    .execute();

  const newRating = parseFloat(avgRatingResult[0]?.avgRating || '0');

  // Update the rating in the appropriate table
  switch (targetType) {
    case 'shop':
      await db.update(shopsTable)
        .set({ rating: newRating })
        .where(eq(shopsTable.id, targetId))
        .execute();
      break;
    case 'product':
      await db.update(productsTable)
        .set({ rating: newRating })
        .where(eq(productsTable.id, targetId))
        .execute();
      break;
    // Courier ratings are not stored in a separate field, only in ratings table
    case 'courier':
      // No update needed for courier table as ratings are handled separately
      break;
  }
}