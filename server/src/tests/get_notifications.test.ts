import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { getNotifications } from '../handlers/get_notifications';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  phone: '+998901234567',
  role: 'customer' as const,
  full_name: 'Test User'
};

// Test notification data
const testNotification1 = {
  title: 'Order Update',
  message: 'Your order has been confirmed',
  type: 'order_update' as const
};

const testNotification2 = {
  title: 'New Promotion',
  message: 'Check out our latest deals',
  type: 'system' as const
};

const testNotification3 = {
  title: 'Rating Received',
  message: 'You received a new rating',
  type: 'rating' as const
};

describe('getNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return notifications for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test notifications
    await db.insert(notificationsTable)
      .values([
        {
          user_id: userId,
          ...testNotification1
        },
        {
          user_id: userId,
          ...testNotification2
        }
      ])
      .execute();

    const result = await getNotifications(userId);

    expect(result).toHaveLength(2);
    
    // Check that both notifications are present (order may vary due to timing)
    const titles = result.map(n => n.title).sort();
    const messages = result.map(n => n.message).sort();
    const types = result.map(n => n.type).sort();
    
    expect(titles).toEqual(['New Promotion', 'Order Update']);
    expect(messages).toEqual([testNotification1.message, testNotification2.message].sort());
    expect(types).toEqual(['order_update', 'system']);
    
    // Verify common fields for all notifications
    result.forEach(notification => {
      expect(notification.is_read).toBe(false);
      expect(notification.user_id).toEqual(userId);
      expect(notification.created_at).toBeInstanceOf(Date);
      expect(notification.id).toBeDefined();
    });
  });

  it('should return notifications ordered by creation date (newest first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create notifications with specific timing
    const firstNotification = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        ...testNotification1
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondNotification = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        ...testNotification2
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdNotification = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        ...testNotification3
      })
      .returning()
      .execute();

    const result = await getNotifications(userId);

    expect(result).toHaveLength(3);
    
    // Verify order (newest first)
    expect(result[0].id).toEqual(thirdNotification[0].id);
    expect(result[1].id).toEqual(secondNotification[0].id);
    expect(result[2].id).toEqual(firstNotification[0].id);
    
    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should return empty array for user with no notifications', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const result = await getNotifications(userId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return notifications for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test2@example.com',
        username: 'testuser2',
        phone: '+998907654321',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create notifications for both users
    await db.insert(notificationsTable)
      .values([
        {
          user_id: user1Id,
          ...testNotification1
        },
        {
          user_id: user2Id,
          ...testNotification2
        },
        {
          user_id: user1Id,
          ...testNotification3
        }
      ])
      .execute();

    const result = await getNotifications(user1Id);

    expect(result).toHaveLength(2);
    expect(result.every(notification => notification.user_id === user1Id)).toBe(true);
    
    // Verify we get the right notifications for user1
    const titles = result.map(n => n.title).sort();
    expect(titles).toEqual(['Order Update', 'Rating Received']);
  });

  it('should return notifications with all required fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test notification
    await db.insert(notificationsTable)
      .values({
        user_id: userId,
        ...testNotification1
      })
      .execute();

    const result = await getNotifications(userId);

    expect(result).toHaveLength(1);
    const notification = result[0];
    
    // Verify all required fields are present
    expect(notification.id).toBeDefined();
    expect(notification.user_id).toEqual(userId);
    expect(notification.title).toEqual(testNotification1.title);
    expect(notification.message).toEqual(testNotification1.message);
    expect(notification.type).toEqual(testNotification1.type);
    expect(typeof notification.is_read).toBe('boolean');
    expect(notification.created_at).toBeInstanceOf(Date);
  });

  it('should handle notifications with different types correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create notifications with all different types
    await db.insert(notificationsTable)
      .values([
        {
          user_id: userId,
          title: 'Order Update',
          message: 'Order status changed',
          type: 'order_update'
        },
        {
          user_id: userId,
          title: 'New Order',
          message: 'You have a new order',
          type: 'new_order'
        },
        {
          user_id: userId,
          title: 'Rating',
          message: 'You received a rating',
          type: 'rating'
        },
        {
          user_id: userId,
          title: 'System',
          message: 'System maintenance notice',
          type: 'system'
        }
      ])
      .execute();

    const result = await getNotifications(userId);

    expect(result).toHaveLength(4);
    
    const types = result.map(n => n.type).sort();
    expect(types).toEqual(['new_order', 'order_update', 'rating', 'system']);
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    const result = await getNotifications(nonExistentUserId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});