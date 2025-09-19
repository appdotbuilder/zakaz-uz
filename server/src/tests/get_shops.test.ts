import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable } from '../db/schema';
import { getShops } from '../handlers/get_shops';

// Test data
const testUser = {
  email: 'shopowner@example.com',
  username: 'shopowner',
  phone: '+998901234567',
  role: 'shop' as const,
  full_name: 'Shop Owner',
  avatar_url: null,
  is_active: true
};

const testShop = {
  name: 'Test Shop',
  description: 'A shop for testing',
  address: 'Test Address 123',
  phone: '+998901234567',
  image_url: 'https://example.com/shop.jpg',
  is_active: true,
  rating: 4.5
};

describe('getShops', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active shops', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test shop
    await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: userId
      })
      .returning()
      .execute();

    const result = await getShops();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Shop');
    expect(result[0].description).toBe('A shop for testing');
    expect(result[0].address).toBe('Test Address 123');
    expect(result[0].phone).toBe('+998901234567');
    expect(result[0].image_url).toBe('https://example.com/shop.jpg');
    expect(result[0].is_active).toBe(true);
    expect(result[0].rating).toBe(4.5);
    expect(result[0].user_id).toBe(userId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple active shops', async () => {
    // Create first test user and shop
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: userResult1[0].id,
        name: 'First Shop'
      })
      .returning()
      .execute();

    // Create second test user and shop
    const userResult2 = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'shopowner2@example.com',
        username: 'shopowner2',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: userResult2[0].id,
        name: 'Second Shop',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    const result = await getShops();

    expect(result).toHaveLength(2);
    const shopNames = result.map(shop => shop.name);
    expect(shopNames).toContain('First Shop');
    expect(shopNames).toContain('Second Shop');
  });

  it('should not return inactive shops', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create inactive shop
    await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: userResult[0].id,
        is_active: false
      })
      .returning()
      .execute();

    const result = await getShops();

    expect(result).toHaveLength(0);
  });

  it('should not return shops with inactive users', async () => {
    // Create inactive test user
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        is_active: false
      })
      .returning()
      .execute();

    // Create active shop with inactive user
    await db.insert(shopsTable)
      .values({
        ...testShop,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const result = await getShops();

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no shops exist', async () => {
    const result = await getShops();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle shops with null optional fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create shop with null optional fields
    await db.insert(shopsTable)
      .values({
        name: 'Minimal Shop',
        address: 'Test Address 456',
        phone: '+998901234568',
        user_id: userResult[0].id,
        description: null,
        image_url: null,
        is_active: true,
        rating: 0
      })
      .returning()
      .execute();

    const result = await getShops();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Minimal Shop');
    expect(result[0].description).toBe(null);
    expect(result[0].image_url).toBe(null);
    expect(result[0].rating).toBe(0);
  });
});