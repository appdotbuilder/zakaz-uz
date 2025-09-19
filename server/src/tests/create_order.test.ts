import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, productCategoriesTable, productsTable, ordersTable, orderItemsTable, notificationsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: string;
  let shopId: string;
  let shopUserId: string;
  let categoryId: string;
  let productId1: string;
  let productId2: string;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(usersTable)
      .values({
        email: 'customer@test.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test Customer',
        is_active: true
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create shop owner
    const shopUserResult = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '+998907654321',
        role: 'shop',
        full_name: 'Shop Owner',
        is_active: true
      })
      .returning()
      .execute();
    shopUserId = shopUserResult[0].id;

    // Create test shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: shopUserId,
        name: 'Test Shop',
        address: 'Test Address, Tashkent',
        phone: '+998907654321',
        is_active: true,
        rating: 0
      })
      .returning()
      .execute();
    shopId = shopResult[0].id;

    // Create product category
    const categoryResult = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: categoryId,
        name: 'Test Product 1',
        price: '15.50',
        quantity: 10,
        is_available: true,
        rating: 0
      })
      .returning()
      .execute();
    productId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: categoryId,
        name: 'Test Product 2',
        price: '25.00',
        quantity: 5,
        is_available: true,
        rating: 0
      })
      .returning()
      .execute();
    productId2 = product2Result[0].id;
  });

  const testInput: CreateOrderInput = {
    shop_id: '',
    items: [
      { product_id: '', quantity: 2 },
      { product_id: '', quantity: 1 }
    ],
    delivery_address: 'Test Delivery Address, Tashkent, Uzbekistan',
    delivery_phone: '+998901111111',
    customer_notes: 'Please call before delivery'
  };

  it('should create an order successfully', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 2 },
        { product_id: productId2, quantity: 1 }
      ]
    };

    const result = await createOrder(input, customerId);

    // Verify order details
    expect(result.id).toBeDefined();
    expect(result.customer_id).toEqual(customerId);
    expect(result.shop_id).toEqual(shopId);
    expect(result.status).toEqual('pending');
    expect(result.total_amount).toEqual(56); // (15.50 * 2) + (25.00 * 1)
    expect(result.delivery_address).toEqual(input.delivery_address);
    expect(result.delivery_phone).toEqual(input.delivery_phone);
    expect(result.customer_notes).toEqual(input.customer_notes);
    expect(result.courier_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save order to database', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 2 }
      ]
    };

    const result = await createOrder(input, customerId);

    // Verify order in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_id).toEqual(customerId);
    expect(orders[0].shop_id).toEqual(shopId);
    expect(parseFloat(orders[0].total_amount)).toEqual(31); // 15.50 * 2
  });

  it('should create order items', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 2 },
        { product_id: productId2, quantity: 1 }
      ]
    };

    const result = await createOrder(input, customerId);

    // Verify order items in database
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);

    const item1 = orderItems.find(item => item.product_id === productId1);
    const item2 = orderItems.find(item => item.product_id === productId2);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(parseFloat(item1!.unit_price)).toEqual(15.50);
    expect(parseFloat(item1!.total_price)).toEqual(31);

    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(25.00);
    expect(parseFloat(item2!.total_price)).toEqual(25);
  });

  it('should update product quantities', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 3 },
        { product_id: productId2, quantity: 2 }
      ]
    };

    await createOrder(input, customerId);

    // Check updated quantities
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId1))
      .execute();
    expect(products[0].quantity).toEqual(7); // 10 - 3

    const products2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId2))
      .execute();
    expect(products2[0].quantity).toEqual(3); // 5 - 2
  });

  it('should send notification to shop owner', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 1 }
      ]
    };

    await createOrder(input, customerId);

    // Check notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, shopUserId))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toEqual('Yangi buyurtma');
    expect(notifications[0].message).toContain('Test Customer');
    expect(notifications[0].message).toContain('15.5');
    expect(notifications[0].type).toEqual('new_order');
    expect(notifications[0].is_read).toEqual(false);
  });

  it('should throw error for inactive customer', async () => {
    // Deactivate customer
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, customerId))
      .execute();

    const input = {
      ...testInput,
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 1 }]
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/customer not found or inactive/i);
  });

  it('should throw error for non-existent customer', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 1 }]
    };

    await expect(createOrder(input, '00000000-0000-0000-0000-000000000001')).rejects.toThrow(/customer not found or inactive/i);
  });

  it('should throw error for inactive shop', async () => {
    // Deactivate shop
    await db.update(shopsTable)
      .set({ is_active: false })
      .where(eq(shopsTable.id, shopId))
      .execute();

    const input = {
      ...testInput,
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 1 }]
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/shop not found or inactive/i);
  });

  it('should throw error for non-existent shop', async () => {
    const input = {
      ...testInput,
      shop_id: '00000000-0000-0000-0000-000000000002',
      items: [{ product_id: productId1, quantity: 1 }]
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/shop not found or inactive/i);
  });

  it('should throw error for unavailable product', async () => {
    // Make product unavailable
    await db.update(productsTable)
      .set({ is_available: false })
      .where(eq(productsTable.id, productId1))
      .execute();

    const input = {
      ...testInput,
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 1 }]
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/product .* not found or not available/i);
  });

  it('should throw error for product from different shop', async () => {
    // Create another shop and product
    const anotherShopUserResult = await db.insert(usersTable)
      .values({
        email: 'another@test.com',
        phone: '+998909999999',
        role: 'shop',
        full_name: 'Another Shop Owner',
        is_active: true
      })
      .returning()
      .execute();

    const anotherShopResult = await db.insert(shopsTable)
      .values({
        user_id: anotherShopUserResult[0].id,
        name: 'Another Shop',
        address: 'Another Address',
        phone: '+998909999999',
        is_active: true,
        rating: 0
      })
      .returning()
      .execute();

    const anotherProductResult = await db.insert(productsTable)
      .values({
        shop_id: anotherShopResult[0].id,
        category_id: categoryId,
        name: 'Another Product',
        price: '10.00',
        quantity: 5,
        is_available: true,
        rating: 0
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      shop_id: shopId, // Ordering from first shop
      items: [{ product_id: anotherProductResult[0].id, quantity: 1 }] // But product from second shop
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/product .* not found or not available in this shop/i);
  });

  it('should throw error for insufficient stock', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 15 }] // More than available (10)
    };

    await expect(createOrder(input, customerId)).rejects.toThrow(/insufficient stock/i);
  });

  it('should calculate total correctly with multiple items', async () => {
    const input = {
      ...testInput,
      shop_id: shopId,
      items: [
        { product_id: productId1, quantity: 3 }, // 15.50 * 3 = 46.50
        { product_id: productId2, quantity: 2 }  // 25.00 * 2 = 50.00
      ]
    };

    const result = await createOrder(input, customerId);

    expect(result.total_amount).toEqual(96.50); // 46.50 + 50.00
  });

  it('should handle order without customer notes', async () => {
    const input = {
      shop_id: shopId,
      items: [{ product_id: productId1, quantity: 1 }],
      delivery_address: 'Test Address',
      delivery_phone: '+998901111111',
      customer_notes: null
    };

    const result = await createOrder(input, customerId);

    expect(result.customer_notes).toBeNull();
  });
});