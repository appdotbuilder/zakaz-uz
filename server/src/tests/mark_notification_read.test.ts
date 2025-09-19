import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { markNotificationRead } from '../handlers/mark_notification_read';
import { eq } from 'drizzle-orm';

describe('markNotificationRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark notification as read for valid user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system',
        is_read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read
    const result = await markNotificationRead(notificationId, userId);

    // Verify result
    expect(result.id).toEqual(notificationId);
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('Test Notification');
    expect(result.message).toEqual('This is a test notification');
    expect(result.type).toEqual('system');
    expect(result.is_read).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update notification in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'order_update',
        is_read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read
    await markNotificationRead(notificationId, userId);

    // Verify database update
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].is_read).toBe(true);
    expect(notifications[0].user_id).toEqual(userId);
    expect(notifications[0].title).toEqual('Test Notification');
  });

  it('should throw error when notification does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    // Try to mark non-existent notification as read
    await expect(markNotificationRead(nonExistentId, userId))
      .rejects.toThrow(/notification not found/i);
  });

  it('should throw error when notification belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        phone: '998901234567',
        role: 'customer',
        full_name: 'User One'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        phone: '998901234568',
        role: 'customer',
        full_name: 'User Two'
      })
      .returning()
      .execute();

    const user2Id = user2Result[0].id;

    // Create notification for user1
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: user1Id,
        title: 'Private Notification',
        message: 'This belongs to user1',
        type: 'new_order',
        is_read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Try to mark notification as read by user2
    await expect(markNotificationRead(notificationId, user2Id))
      .rejects.toThrow(/notification not found/i);
  });

  it('should handle already read notification', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create already read notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        title: 'Already Read',
        message: 'This notification is already read',
        type: 'rating',
        is_read: true
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read (should work even if already read)
    const result = await markNotificationRead(notificationId, userId);

    // Verify result
    expect(result.is_read).toBe(true);
    expect(result.title).toEqual('Already Read');
    expect(result.type).toEqual('rating');
  });

  it('should preserve all notification data when marking as read', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notification with all fields
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        title: 'Complete Notification',
        message: 'This notification has all fields populated',
        type: 'order_update',
        is_read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;
    const originalCreatedAt = notificationResult[0].created_at;

    // Mark notification as read
    const result = await markNotificationRead(notificationId, userId);

    // Verify all original data is preserved
    expect(result.id).toEqual(notificationId);
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('Complete Notification');
    expect(result.message).toEqual('This notification has all fields populated');
    expect(result.type).toEqual('order_update');
    expect(result.is_read).toBe(true);
    expect(result.created_at).toEqual(originalCreatedAt);
  });
});