import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { type Notification } from '../schema';

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Convert database results to schema format
    return results.map(notification => ({
      ...notification,
      created_at: notification.created_at
    }));
  } catch (error) {
    console.error('Get notifications failed:', error);
    throw error;
  }
};