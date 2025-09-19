import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  phone: '+998901234567',
  role: 'customer' as const,
  full_name: 'Test User',
  username: 'testuser'
};

// Test notification input
const testNotificationInput: CreateNotificationInput = {
  user_id: '', // Will be set after user creation
  title: 'Yangi buyurtma',
  message: 'Sizga yangi buyurtma keldi',
  type: 'new_order'
};

describe('createNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a notification', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testNotificationInput, user_id: userId };

    const result = await createNotification(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('Yangi buyurtma');
    expect(result.message).toEqual('Sizga yangi buyurtma keldi');
    expect(result.type).toEqual('new_order');
    expect(result.is_read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save notification to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testNotificationInput, user_id: userId };

    const result = await createNotification(input);

    // Query using proper drizzle syntax
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toEqual(userId);
    expect(notifications[0].title).toEqual('Yangi buyurtma');
    expect(notifications[0].message).toEqual('Sizga yangi buyurtma keldi');
    expect(notifications[0].type).toEqual('new_order');
    expect(notifications[0].is_read).toEqual(false);
    expect(notifications[0].created_at).toBeInstanceOf(Date);
  });

  it('should create notification with different types', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test order_update type
    const orderUpdateInput = {
      user_id: userId,
      title: 'Buyurtma holati yangilandi',
      message: 'Buyurtmangiz tayyorlanmoqda',
      type: 'order_update' as const
    };

    const orderUpdateResult = await createNotification(orderUpdateInput);
    expect(orderUpdateResult.type).toEqual('order_update');

    // Test rating type
    const ratingInput = {
      user_id: userId,
      title: 'Yangi baho',
      message: 'Sizga yangi baho berildi',
      type: 'rating' as const
    };

    const ratingResult = await createNotification(ratingInput);
    expect(ratingResult.type).toEqual('rating');

    // Test system type
    const systemInput = {
      user_id: userId,
      title: 'Tizim xabari',
      message: 'Tizimda yangilanish amalga oshirildi',
      type: 'system' as const
    };

    const systemResult = await createNotification(systemInput);
    expect(systemResult.type).toEqual('system');
  });

  it('should handle notifications for different user roles', async () => {
    // Create customer user
    const customerResult = await db.insert(usersTable)
      .values({ ...testUser, role: 'customer' })
      .returning()
      .execute();

    // Create shop user
    const shopResult = await db.insert(usersTable)
      .values({ 
        ...testUser, 
        email: 'shop@example.com',
        username: 'shopuser',
        phone: '+998901234568',
        role: 'shop'
      })
      .returning()
      .execute();

    // Create courier user
    const courierResult = await db.insert(usersTable)
      .values({ 
        ...testUser, 
        email: 'courier@example.com',
        username: 'courieruser',
        phone: '+998901234569',
        role: 'courier'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;
    const shopId = shopResult[0].id;
    const courierId = courierResult[0].id;

    // Create notifications for each user type
    const customerNotification = await createNotification({
      user_id: customerId,
      title: 'Mijoz bildirishnomasi',
      message: 'Buyurtmangiz qabul qilindi',
      type: 'order_update'
    });

    const shopNotification = await createNotification({
      user_id: shopId,
      title: 'Do\'kon bildirishnomasi',
      message: 'Yangi buyurtma keldi',
      type: 'new_order'
    });

    const courierNotification = await createNotification({
      user_id: courierId,
      title: 'Kuryer bildirishnomasi',
      message: 'Yangi yetkazib berish topshirig\'i',
      type: 'new_order'
    });

    expect(customerNotification.user_id).toEqual(customerId);
    expect(shopNotification.user_id).toEqual(shopId);
    expect(courierNotification.user_id).toEqual(courierId);
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...testNotificationInput,
      user_id: '00000000-0000-0000-0000-000000000001' // Non-existent user ID
    };

    await expect(createNotification(input)).rejects.toThrow(/Foydalanuvchi topilmadi/i);
  });

  it('should create multiple notifications for same user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create first notification
    const firstNotification = await createNotification({
      user_id: userId,
      title: 'Birinchi bildirishnoma',
      message: 'Bu birinchi xabar',
      type: 'system'
    });

    // Create second notification
    const secondNotification = await createNotification({
      user_id: userId,
      title: 'Ikkinchi bildirishnoma',
      message: 'Bu ikkinchi xabar',
      type: 'order_update'
    });

    // Verify both notifications exist
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications).toHaveLength(2);
    expect(notifications.find(n => n.id === firstNotification.id)).toBeDefined();
    expect(notifications.find(n => n.id === secondNotification.id)).toBeDefined();
  });
});