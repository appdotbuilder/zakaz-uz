import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  shopsTable, 
  productCategoriesTable, 
  productsTable, 
  ordersTable 
} from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: string;
  let shopOwnerId: string;
  let courierId: string;
  let shopId: string;
  let orderId: string;
  let categoryId: string;
  let productId: string;

  beforeEach(async () => {
    // Create test users
    const customerResult = await db.insert(usersTable)
      .values({
        email: 'customer@test.com',
        username: 'customer',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test Customer'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    const shopOwnerResult = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        username: 'shop',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();
    shopOwnerId = shopOwnerResult[0].id;

    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier@test.com',
        username: 'courier',
        phone: '+998901234569',
        role: 'courier',
        full_name: 'Test Courier'
      })
      .returning()
      .execute();
    courierId = courierResult[0].id;

    // Create test shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: shopOwnerId,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234570'
      })
      .returning()
      .execute();
    shopId = shopResult[0].id;

    // Create test category and product
    const categoryResult = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const productResult = await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: categoryId,
        name: 'Test Product',
        price: '29.99',
        quantity: 10
      })
      .returning()
      .execute();
    productId = productResult[0].id;

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        shop_id: shopId,
        courier_id: courierId,
        status: 'pending',
        total_amount: '59.98',
        delivery_address: 'Test Delivery Address',
        delivery_phone: '+998901234571'
      })
      .returning()
      .execute();
    orderId = orderResult[0].id;
  });

  const testInput: UpdateOrderStatusInput = {
    order_id: '', // Will be set in tests
    status: 'confirmed',
    courier_notes: null,
    estimated_delivery_time: null
  };

  it('should update order status by shop owner', async () => {
    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'confirmed'
    };

    const result = await updateOrderStatus(input, shopOwnerId);

    expect(result.id).toEqual(orderId);
    expect(result.status).toEqual('confirmed');
    expect(result.customer_id).toEqual(customerId);
    expect(result.shop_id).toEqual(shopId);
    expect(typeof result.total_amount).toBe('number');
    expect(result.total_amount).toEqual(59.98);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update order status by courier', async () => {
    // First set order to ready status (so courier can pick it up)
    await db.update(ordersTable)
      .set({ status: 'ready' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'picked_up',
      courier_notes: 'Order picked up from shop'
    };

    const result = await updateOrderStatus(input, courierId);

    expect(result.status).toEqual('picked_up');
    expect(result.courier_notes).toEqual('Order picked up from shop');
    expect(result.courier_id).toEqual(courierId);
  });

  it('should set actual delivery time when status is delivered', async () => {
    // Set order to on_the_way status first
    await db.update(ordersTable)
      .set({ status: 'on_the_way' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'delivered'
    };

    const result = await updateOrderStatus(input, courierId);

    expect(result.status).toEqual('delivered');
    expect(result.actual_delivery_time).toBeInstanceOf(Date);
  });

  it('should save updated order to database', async () => {
    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'preparing',
      estimated_delivery_time: new Date('2024-12-20T15:30:00Z')
    };

    await updateOrderStatus(input, shopOwnerId);

    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toEqual('preparing');
    expect(orders[0].estimated_delivery_time).toBeInstanceOf(Date);
    expect(orders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject update for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: '00000000-0000-0000-0000-000000000000',
      status: 'confirmed'
    };

    await expect(updateOrderStatus(input, shopOwnerId)).rejects.toThrow(/order not found/i);
  });

  it('should reject update from unauthorized user', async () => {
    // Create another user who has no relation to the order
    const unauthorizedResult = await db.insert(usersTable)
      .values({
        email: 'unauthorized@test.com',
        phone: '+998901234572',
        role: 'customer',
        full_name: 'Unauthorized User'
      })
      .returning()
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'confirmed'
    };

    await expect(updateOrderStatus(input, unauthorizedResult[0].id))
      .rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject invalid status for shop owner', async () => {
    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'picked_up' // Shop owner cannot set this status
    };

    await expect(updateOrderStatus(input, shopOwnerId))
      .rejects.toThrow(/shop owners can only update/i);
  });

  it('should reject invalid status for courier', async () => {
    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'preparing' // Courier cannot set this status
    };

    await expect(updateOrderStatus(input, courierId))
      .rejects.toThrow(/couriers can only update/i);
  });

  it('should prevent updating delivered orders', async () => {
    // Set order to delivered
    await db.update(ordersTable)
      .set({ status: 'delivered' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'on_the_way'
    };

    await expect(updateOrderStatus(input, courierId))
      .rejects.toThrow(/cannot update status of delivered/i);
  });

  it('should prevent updating cancelled orders', async () => {
    // Set order to cancelled
    await db.update(ordersTable)
      .set({ status: 'cancelled' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'confirmed'
    };

    await expect(updateOrderStatus(input, shopOwnerId))
      .rejects.toThrow(/cannot update status of delivered/i);
  });

  it('should prevent courier from moving status backwards', async () => {
    // Set order to delivered
    await db.update(ordersTable)
      .set({ status: 'on_the_way' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'picked_up' // Moving backwards
    };

    await expect(updateOrderStatus(input, courierId))
      .rejects.toThrow(/only shop owners can move order status backwards/i);
  });

  it('should allow shop owner to move status backwards', async () => {
    // Set order to confirmed first
    await db.update(ordersTable)
      .set({ status: 'confirmed' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'pending' // Moving backwards
    };

    const result = await updateOrderStatus(input, shopOwnerId);

    expect(result.status).toEqual('pending');
  });

  it('should handle null courier notes', async () => {
    // Set order to ready so courier can update it
    await db.update(ordersTable)
      .set({ status: 'ready' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      ...testInput,
      order_id: orderId,
      status: 'picked_up',
      courier_notes: null
    };

    const result = await updateOrderStatus(input, courierId);

    expect(result.status).toEqual('picked_up');
    expect(result.courier_notes).toBeNull();
  });
});