import { db } from '../db';
import { courierLocationsTable } from '../db/schema';
import { type CourierLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const getCourierLocation = async (courierId: string): Promise<CourierLocation | null> => {
  try {
    // Find courier location by courier_id
    const results = await db.select()
      .from(courierLocationsTable)
      .where(eq(courierLocationsTable.courier_id, courierId))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const location = results[0];
    
    // Return the courier location with proper type structure
    return {
      id: location.id,
      courier_id: location.courier_id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      is_online: location.is_online,
      last_updated: location.last_updated
    };
  } catch (error) {
    console.error('Failed to get courier location:', error);
    throw error;
  }
};