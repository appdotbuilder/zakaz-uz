import { type CreateNotificationInput, type Notification } from '../schema';

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating in-app notifications for users.
    // It should store the notification in database and trigger push notifications via FCM.
    // All notification text should be in Uzbek language.
    return Promise.resolve({
        id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        user_id: input.user_id,
        title: input.title,
        message: input.message,
        type: input.type,
        is_read: false,
        created_at: new Date()
    } as Notification);
}