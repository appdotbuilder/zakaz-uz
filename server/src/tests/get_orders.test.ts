import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, ordersTable, productCategoriesTable, productsTable } from '../db/schema';
import { getOrders } from '../handlers/get_orders';

// Test data
const testCustomer = {
  email: 'customer@test.com',
  phone: '+998901234567',
  role: 'customer' as const,
  full_name: 'Test Customer',
  is_active: true
};

const testShopOwner = {
  email: 'shop@test.com',
  phone: '+998901234568',
  role: 'shop' as const,
  full_name: 'Shop Owner',
  is_active: true
};

const testCourier = {
  email: 'courier@test.com',
  phone: '+998901234569',
  role: 'courier' as const,
  full_name: 'Test Courier',
  is_active: true
};

const testAdmin = {
  email: 'admin@test.com',
  phone: '+998901234570',
  role: 'admin' as const,
  full_name: 'Test Admin',
  is_active: true
};

const testShop = {
  name: 'Test Shop',
  description: 'A test shop',
  address: 'Test Address 123',
  phone: '+998901234571',
  is_active: true,
  rating: 0
};

const testCategory = {
  name: 'Test Category',
  description: 'A test category'
};

const testProduct = {
  name: 'Test Product',
  description: 'A test product',
  price: '25.50',
  quantity: 10,
  is_available: true,
  rating: 0
};

const testOrder = {
  status: 'pending' as const,
  total_amount: '50.00',
  delivery_address: 'Delivery Address 456',
  delivery_phone: '+998901234572',
  customer_notes: 'Test order'
};

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer orders for customer role', async () => {
    // Create test users
    const [customer, shopOwner] = await db.insert(usersTable)
      .values([testCustomer, testShopOwner])
      .returning()
      .execute();

    // Create shop
    const [shop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: shopOwner.id
      })
      .returning()
      .execute();

    // Create category and product
    const [category] = await db.insert(productCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    await db.insert(productsTable)
      .values({
        ...testProduct,
        shop_id: shop.id,
        category_id: category.id
      })
      .execute();

    // Create orders - one for this customer, one for another
    const [customerOrder] = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: customer.id,
        shop_id: shop.id
      })
      .returning()
      .execute();

    // Create another customer and their order
    const [otherCustomer] = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        phone: '+998901234573',
        role: 'customer' as const,
        full_name: 'Other Customer',
        is_active: true
      })
      .returning()
      .execute();

    await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: otherCustomer.id,
        shop_id: shop.id
      })
      .execute();

    const result = await getOrders(customer.id, 'customer');

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(customerOrder.id);
    expect(result[0].customer_id).toEqual(customer.id);
    expect(result[0].total_amount).toEqual(50.00);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should return shop orders for shop role', async () => {
    // Create test users
    const [customer, shopOwner, otherShopOwner] = await db.insert(usersTable)
      .values([testCustomer, testShopOwner, {
        email: 'other-shop@test.com',
        phone: '+998901234574',
        role: 'shop' as const,
        full_name: 'Other Shop Owner',
        is_active: true
      }])
      .returning()
      .execute();

    // Create shops
    const [shop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: shopOwner.id
      })
      .returning()
      .execute();

    const [otherShop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        name: 'Other Shop',
        user_id: otherShopOwner.id,
        phone: '+998901234575'
      })
      .returning()
      .execute();

    // Create category and products
    const [category] = await db.insert(productCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    await db.insert(productsTable)
      .values([
        {
          ...testProduct,
          shop_id: shop.id,
          category_id: category.id
        },
        {
          ...testProduct,
          name: 'Other Product',
          shop_id: otherShop.id,
          category_id: category.id
        }
      ])
      .execute();

    // Create orders - one for this shop, one for other shop
    const [shopOrder] = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: customer.id,
        shop_id: shop.id
      })
      .returning()
      .execute();

    await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: customer.id,
        shop_id: otherShop.id
      })
      .execute();

    const result = await getOrders(shopOwner.id, 'shop');

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(shopOrder.id);
    expect(result[0].shop_id).toEqual(shop.id);
    expect(result[0].total_amount).toEqual(50.00);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should return available and assigned orders for courier role', async () => {
    // Create test users
    const [customer, shopOwner, courier] = await db.insert(usersTable)
      .values([testCustomer, testShopOwner, testCourier])
      .returning()
      .execute();

    // Create shop
    const [shop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: shopOwner.id
      })
      .returning()
      .execute();

    // Create category and product
    const [category] = await db.insert(productCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    await db.insert(productsTable)
      .values({
        ...testProduct,
        shop_id: shop.id,
        category_id: category.id
      })
      .execute();

    // Create orders - one available (no courier), one assigned to this courier, one assigned to other courier
    const [availableOrder, assignedOrder] = await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          customer_id: customer.id,
          shop_id: shop.id,
          courier_id: null // Available order
        },
        {
          ...testOrder,
          customer_id: customer.id,
          shop_id: shop.id,
          courier_id: courier.id // Assigned to this courier
        }
      ])
      .returning()
      .execute();

    // Create another courier and assign order to them
    const [otherCourier] = await db.insert(usersTable)
      .values({
        email: 'other-courier@test.com',
        phone: '+998901234576',
        role: 'courier' as const,
        full_name: 'Other Courier',
        is_active: true
      })
      .returning()
      .execute();

    await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: customer.id,
        shop_id: shop.id,
        courier_id: otherCourier.id // Assigned to other courier
      })
      .execute();

    const result = await getOrders(courier.id, 'courier');

    expect(result).toHaveLength(2);
    
    const orderIds = result.map(order => order.id);
    expect(orderIds).toContain(availableOrder.id);
    expect(orderIds).toContain(assignedOrder.id);
    
    result.forEach(order => {
      expect(order.total_amount).toEqual(50.00);
      expect(typeof order.total_amount).toBe('number');
    });
  });

  it('should return all orders for admin role', async () => {
    // Create test users
    const [customer, shopOwner, courier, admin] = await db.insert(usersTable)
      .values([testCustomer, testShopOwner, testCourier, testAdmin])
      .returning()
      .execute();

    // Create shop
    const [shop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: shopOwner.id
      })
      .returning()
      .execute();

    // Create category and product
    const [category] = await db.insert(productCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    await db.insert(productsTable)
      .values({
        ...testProduct,
        shop_id: shop.id,
        category_id: category.id
      })
      .execute();

    // Create multiple orders
    await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          customer_id: customer.id,
          shop_id: shop.id,
          courier_id: null
        },
        {
          ...testOrder,
          customer_id: customer.id,
          shop_id: shop.id,
          courier_id: courier.id
        },
        {
          ...testOrder,
          customer_id: customer.id,
          shop_id: shop.id,
          status: 'delivered' as const
        }
      ])
      .execute();

    const result = await getOrders(admin.id, 'admin');

    expect(result).toHaveLength(3);
    result.forEach(order => {
      expect(order.total_amount).toEqual(50.00);
      expect(typeof order.total_amount).toBe('number');
      expect(order.shop_id).toEqual(shop.id);
    });
  });

  it('should return empty array for unknown role', async () => {
    // Create test user
    const [customer] = await db.insert(usersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const result = await getOrders(customer.id, 'unknown_role');

    expect(result).toHaveLength(0);
  });

  it('should handle empty results correctly', async () => {
    // Create test user but no orders
    const [customer] = await db.insert(usersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const result = await getOrders(customer.id, 'customer');

    expect(result).toHaveLength(0);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test users
    const [customer, shopOwner] = await db.insert(usersTable)
      .values([testCustomer, testShopOwner])
      .returning()
      .execute();

    // Create shop
    const [shop] = await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: shopOwner.id
      })
      .returning()
      .execute();

    // Create category and product
    const [category] = await db.insert(productCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    await db.insert(productsTable)
      .values({
        ...testProduct,
        shop_id: shop.id,
        category_id: category.id
      })
      .execute();

    // Create order with specific decimal amount
    await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: customer.id,
        shop_id: shop.id,
        total_amount: '123.45' // String in database
      })
      .execute();

    const result = await getOrders(customer.id, 'customer');

    expect(result).toHaveLength(1);
    expect(result[0].total_amount).toEqual(123.45);
    expect(typeof result[0].total_amount).toBe('number');
  });
});