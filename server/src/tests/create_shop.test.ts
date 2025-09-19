import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shopsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateShopInput } from '../schema';
import { createShop } from '../handlers/create_shop';

// Test input with all required fields
const testInput: CreateShopInput = {
  name: 'Test Market',
  description: 'A test market for testing purposes',
  address: 'Tashkent, Uzbekistan, Test Street 123',
  phone: '+998901234567',
  image_url: 'https://example.com/shop-image.jpg'
};

// Helper function to create a test user
async function createTestUser(role: 'customer' | 'shop' | 'courier' | 'admin' = 'shop') {
  const result = await db.insert(usersTable)
    .values({
      email: `test-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      phone: `+99890123456${Math.floor(Math.random() * 10)}`,
      role,
      full_name: 'Test User',
      avatar_url: null,
      is_active: true
    })
    .returning()
    .execute();
  
  return result[0];
}

describe('createShop', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a shop successfully', async () => {
    const user = await createTestUser('shop');
    const result = await createShop(testInput, user.id);

    // Verify returned shop data
    expect(result.user_id).toEqual(user.id);
    expect(result.name).toEqual('Test Market');
    expect(result.description).toEqual('A test market for testing purposes');
    expect(result.address).toEqual('Tashkent, Uzbekistan, Test Street 123');
    expect(result.phone).toEqual('+998901234567');
    expect(result.image_url).toEqual('https://example.com/shop-image.jpg');
    expect(result.is_active).toBe(true);
    expect(result.rating).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save shop to database', async () => {
    const user = await createTestUser('shop');
    const result = await createShop(testInput, user.id);

    // Query database to verify shop was saved
    const shops = await db.select()
      .from(shopsTable)
      .where(eq(shopsTable.id, result.id))
      .execute();

    expect(shops).toHaveLength(1);
    const savedShop = shops[0];
    expect(savedShop.user_id).toEqual(user.id);
    expect(savedShop.name).toEqual('Test Market');
    expect(savedShop.description).toEqual('A test market for testing purposes');
    expect(savedShop.address).toEqual('Tashkent, Uzbekistan, Test Street 123');
    expect(savedShop.phone).toEqual('+998901234567');
    expect(savedShop.image_url).toEqual('https://example.com/shop-image.jpg');
    expect(savedShop.is_active).toBe(true);
    expect(savedShop.rating).toEqual(0);
    expect(savedShop.created_at).toBeInstanceOf(Date);
    expect(savedShop.updated_at).toBeInstanceOf(Date);
  });

  it('should create shop with minimal data (null optional fields)', async () => {
    const user = await createTestUser('shop');
    const minimalInput: CreateShopInput = {
      name: 'Minimal Shop',
      description: null,
      address: 'Simple Address',
      phone: '+998909876543',
      image_url: null
    };

    const result = await createShop(minimalInput, user.id);

    expect(result.name).toEqual('Minimal Shop');
    expect(result.description).toBeNull();
    expect(result.address).toEqual('Simple Address');
    expect(result.phone).toEqual('+998909876543');
    expect(result.image_url).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.rating).toEqual(0);
  });

  it('should throw error if user does not exist', async () => {
    const nonExistentUserId = '550e8400-e29b-41d4-a716-446655440000';

    await expect(createShop(testInput, nonExistentUserId))
      .rejects
      .toThrow(/user not found/i);
  });

  it('should throw error if user does not have shop role', async () => {
    const customer = await createTestUser('customer');

    await expect(createShop(testInput, customer.id))
      .rejects
      .toThrow(/user does not have shop role/i);
  });

  it('should throw error if user already has a shop', async () => {
    const user = await createTestUser('shop');

    // Create first shop
    await createShop(testInput, user.id);

    // Try to create second shop for same user
    const secondShopInput: CreateShopInput = {
      name: 'Second Shop',
      description: 'Another shop',
      address: 'Another Address',
      phone: '+998901111111',
      image_url: null
    };

    await expect(createShop(secondShopInput, user.id))
      .rejects
      .toThrow(/user already has a shop/i);
  });

  it('should handle different user roles correctly', async () => {
    const courier = await createTestUser('courier');
    const admin = await createTestUser('admin');

    // Courier should not be able to create shop
    await expect(createShop(testInput, courier.id))
      .rejects
      .toThrow(/user does not have shop role/i);

    // Admin should not be able to create shop (only shop role can)
    await expect(createShop(testInput, admin.id))
      .rejects
      .toThrow(/user does not have shop role/i);
  });

  it('should handle various phone number formats', async () => {
    const user1 = await createTestUser('shop');
    const user2 = await createTestUser('shop');
    const user3 = await createTestUser('shop');

    // Test different valid phone formats
    const input1 = { ...testInput, phone: '+998901234567' };
    const input2 = { ...testInput, phone: '998909876543' };
    const input3 = { ...testInput, phone: '0909123456' };

    const shop1 = await createShop(input1, user1.id);
    const shop2 = await createShop(input2, user2.id);
    const shop3 = await createShop(input3, user3.id);

    expect(shop1.phone).toEqual('+998901234567');
    expect(shop2.phone).toEqual('998909876543');
    expect(shop3.phone).toEqual('0909123456');
  });

  it('should preserve timestamp precision', async () => {
    const user = await createTestUser('shop');
    const beforeCreate = new Date();
    
    const result = await createShop(testInput, user.id);
    
    const afterCreate = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});