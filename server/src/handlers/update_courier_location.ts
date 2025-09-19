import { db } from '../db';
import { courierLocationsTable, usersTable } from '../db/schema';
import { type UpdateCourierLocationInput, type CourierLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCourierLocation = async (input: UpdateCourierLocationInput, courierId: string): Promise<CourierLocation> => {
  try {
    // First verify that the courier exists and has the correct role
    const courier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, courierId))
      .execute();

    if (courier.length === 0) {
      throw new Error('Courier not found');
    }

    if (courier[0].role !== 'courier') {
      throw new Error('User is not a courier');
    }

    // Check if courier location record exists
    const existingLocation = await db.select()
      .from(courierLocationsTable)
      .where(eq(courierLocationsTable.courier_id, courierId))
      .execute();

    let result;

    if (existingLocation.length > 0) {
      // Update existing location
      const updateResult = await db.update(courierLocationsTable)
        .set({
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          is_online: input.is_online,
          last_updated: new Date()
        })
        .where(eq(courierLocationsTable.courier_id, courierId))
        .returning()
        .execute();
      
      result = updateResult[0];
    } else {
      // Insert new location record
      const insertResult = await db.insert(courierLocationsTable)
        .values({
          courier_id: courierId,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          is_online: input.is_online,
          last_updated: new Date()
        })
        .returning()
        .execute();
      
      result = insertResult[0];
    }

    return {
      ...result,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy
    };
  } catch (error) {
    console.error('Courier location update failed:', error);
    throw error;
  }
};