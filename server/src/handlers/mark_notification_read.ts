import { type Notification } from '../schema';

export async function markNotificationRead(notificationId: string, userId: string): Promise<Notification> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is marking a notification as read by the user.
    // It should validate that the notification belongs to the user.
    return Promise.resolve({
        id: notificationId,
        user_id: userId,
        title: 'Placeholder title',
        message: 'Placeholder message',
        type: 'system',
        is_read: true,
        created_at: new Date()
    } as Notification);
}