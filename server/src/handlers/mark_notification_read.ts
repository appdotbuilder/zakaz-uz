import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function markNotificationRead(notificationId: string, userId: string): Promise<Notification> {
  try {
    // Update the notification to mark as read, ensuring it belongs to the user
    const result = await db.update(notificationsTable)
      .set({
        is_read: true
      })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.user_id, userId)
        )
      )
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Notification not found or does not belong to user');
    }

    return result[0];
  } catch (error) {
    console.error('Mark notification read failed:', error);
    throw error;
  }
}