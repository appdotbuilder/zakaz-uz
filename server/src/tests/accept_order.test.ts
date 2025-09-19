import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, ordersTable, notificationsTable, productCategoriesTable, productsTable } from '../db/schema';
import { acceptOrder } from '../handlers/accept_order';
import { eq } from 'drizzle-orm';

describe('acceptOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: string;
  let shopOwnerId: string;
  let shopId: string;
  let courierId: string;
  let orderId: string;
  let categoryId: string;

  beforeEach(async () => {
    // Create test users
    const customers = await db.insert(usersTable)
      .values({
        email: 'customer@test.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test Customer'
      })
      .returning()
      .execute();
    customerId = customers[0].id;

    const shopOwners = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();
    shopOwnerId = shopOwners[0].id;

    const couriers = await db.insert(usersTable)
      .values({
        email: 'courier@test.com',
        phone: '+998901234569',
        role: 'courier',
        full_name: 'Test Courier'
      })
      .returning()
      .execute();
    courierId = couriers[0].id;

    // Create test shop
    const shops = await db.insert(shopsTable)
      .values({
        user_id: shopOwnerId,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234570'
      })
      .returning()
      .execute();
    shopId = shops[0].id;

    // Create test category and product (required for valid order)
    const categories = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    categoryId = categories[0].id;

    await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: categoryId,
        name: 'Test Product',
        price: '10.00',
        quantity: 100
      })
      .execute();

    // Create test order in 'ready' status
    const orders = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        shop_id: shopId,
        status: 'ready',
        total_amount: '25.50',
        delivery_address: 'Test Delivery Address',
        delivery_phone: '+998901234571'
      })
      .returning()
      .execute();
    orderId = orders[0].id;
  });

  it('should successfully accept a ready order', async () => {
    const result = await acceptOrder(orderId, courierId);

    // Validate returned order
    expect(result.id).toEqual(orderId);
    expect(result.courier_id).toEqual(courierId);
    expect(result.status).toEqual('picked_up');
    expect(result.total_amount).toEqual(25.5);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update order in database with courier assignment', async () => {
    await acceptOrder(orderId, courierId);

    // Check database state
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .execute();

    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order.courier_id).toEqual(courierId);
    expect(order.status).toEqual('picked_up');
    expect(order.updated_at).toBeInstanceOf(Date);
  });

  it('should create notifications for customer and shop', async () => {
    await acceptOrder(orderId, courierId);

    // Check notifications were created
    const notifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(notifications).toHaveLength(2);

    // Find customer notification
    const customerNotification = notifications.find(n => n.user_id === customerId);
    expect(customerNotification).toBeDefined();
    expect(customerNotification?.title).toContain('qabul qilindi');
    expect(customerNotification?.type).toEqual('order_update');
    expect(customerNotification?.is_read).toEqual(false);

    // Find shop owner notification
    const shopNotification = notifications.find(n => n.user_id === shopOwnerId);
    expect(shopNotification).toBeDefined();
    expect(shopNotification?.title).toContain('kuryer tomonidan qabul qilindi');
    expect(shopNotification?.type).toEqual('order_update');
    expect(shopNotification?.is_read).toEqual(false);
  });

  it('should throw error if courier not found', async () => {
    const nonExistentCourierId = '00000000-0000-0000-0000-000000000000';

    await expect(acceptOrder(orderId, nonExistentCourierId))
      .rejects.toThrow(/courier not found or invalid/i);
  });

  it('should throw error if courier is not active', async () => {
    // Deactivate courier
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, courierId))
      .execute();

    await expect(acceptOrder(orderId, courierId))
      .rejects.toThrow(/courier not found or invalid/i);
  });

  it('should throw error if user role is not courier', async () => {
    // Use customer ID instead of courier
    await expect(acceptOrder(orderId, customerId))
      .rejects.toThrow(/courier not found or invalid/i);
  });

  it('should throw error if order not found', async () => {
    const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';

    await expect(acceptOrder(nonExistentOrderId, courierId))
      .rejects.toThrow(/order not found/i);
  });

  it('should throw error if order is not in ready status', async () => {
    // Update order to different status
    await db.update(ordersTable)
      .set({ status: 'pending' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    await expect(acceptOrder(orderId, courierId))
      .rejects.toThrow(/order is not ready for pickup/i);
  });

  it('should throw error if order already has a courier assigned', async () => {
    // Create another courier
    const anotherCouriers = await db.insert(usersTable)
      .values({
        email: 'courier2@test.com',
        phone: '+998901234572',
        role: 'courier',
        full_name: 'Another Courier'
      })
      .returning()
      .execute();
    const anotherCourierId = anotherCouriers[0].id;

    // First courier accepts the order
    await acceptOrder(orderId, courierId);

    // Second courier tries to accept the same order
    await expect(acceptOrder(orderId, anotherCourierId))
      .rejects.toThrow(/order has already been accepted by another courier/i);
  });

  it('should handle various order statuses correctly', async () => {
    const statuses = ['pending', 'confirmed', 'preparing', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

    for (const status of statuses) {
      // Create new order for each status test
      const orders = await db.insert(ordersTable)
        .values({
          customer_id: customerId,
          shop_id: shopId,
          status: status as any,
          total_amount: '15.00',
          delivery_address: 'Test Address',
          delivery_phone: '+998901234573'
        })
        .returning()
        .execute();

      const testOrderId = orders[0].id;

      if (status === 'ready') {
        // Should succeed for ready status
        const result = await acceptOrder(testOrderId, courierId);
        expect(result.status).toEqual('picked_up');
      } else {
        // Should fail for all other statuses
        await expect(acceptOrder(testOrderId, courierId))
          .rejects.toThrow(/order is not ready for pickup/i);
      }
    }
  });
});