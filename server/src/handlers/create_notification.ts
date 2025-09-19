import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput, type Notification } from '../schema';
import { eq } from 'drizzle-orm';

export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    // Insert notification record
    const result = await db.insert(notificationsTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        message: input.message,
        type: input.type
      })
      .returning()
      .execute();

    const notification = result[0];
    return {
      ...notification
    };
  } catch (error) {
    console.error('Bildirishnoma yaratishda xatolik:', error);
    throw error;
  }
};