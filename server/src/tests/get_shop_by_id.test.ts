import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable } from '../db/schema';
import { getShopById } from '../handlers/get_shop_by_id';

describe('getShopById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent shop', async () => {
    const result = await getShopById('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBeNull();
  });

  it('should return shop by id', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'shopowner@test.com',
        phone: '+998901234567',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: userId,
        name: 'Test Shop',
        description: 'A test shop',
        address: '123 Test Street, Tashkent',
        phone: '+998901234567',
        image_url: 'https://example.com/shop.jpg',
        is_active: true,
        rating: 4.5
      })
      .returning()
      .execute();

    const shopId = shopResult[0].id;

    // Test retrieval
    const result = await getShopById(shopId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(shopId);
    expect(result!.name).toEqual('Test Shop');
    expect(result!.description).toEqual('A test shop');
    expect(result!.address).toEqual('123 Test Street, Tashkent');
    expect(result!.phone).toEqual('+998901234567');
    expect(result!.image_url).toEqual('https://example.com/shop.jpg');
    expect(result!.is_active).toBe(true);
    expect(result!.rating).toEqual(4.5);
    expect(typeof result!.rating).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle shop with null optional fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'minimal@test.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Minimal Owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create shop with minimal data
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: userId,
        name: 'Minimal Shop',
        description: null,
        address: 'Simple Address',
        phone: '+998901234568',
        image_url: null
      })
      .returning()
      .execute();

    const shopId = shopResult[0].id;

    // Test retrieval
    const result = await getShopById(shopId);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Shop');
    expect(result!.description).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.is_active).toBe(true); // default value
    expect(result!.rating).toEqual(0); // default value
    expect(typeof result!.rating).toBe('number');
  });

  it('should handle inactive shop', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'inactive@test.com',
        phone: '+998901234569',
        role: 'shop',
        full_name: 'Inactive Owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create inactive shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: userId,
        name: 'Inactive Shop',
        address: 'Inactive Address',
        phone: '+998901234569',
        is_active: false,
        rating: 2.3
      })
      .returning()
      .execute();

    const shopId = shopResult[0].id;

    // Test retrieval - should still return inactive shop
    const result = await getShopById(shopId);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Inactive Shop');
    expect(result!.is_active).toBe(false);
    expect(result!.rating).toEqual(2.3);
    expect(typeof result!.rating).toBe('number');
  });

  it('should return shop with correct data types', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'types@test.com',
        phone: '+998901234570',
        role: 'shop',
        full_name: 'Types Owner'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: userId,
        name: 'Types Shop',
        address: 'Types Address',
        phone: '+998901234570',
        rating: 3.7
      })
      .returning()
      .execute();

    const shopId = shopResult[0].id;

    // Test data types
    const result = await getShopById(shopId);

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('string');
    expect(typeof result!.user_id).toBe('string');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.address).toBe('string');
    expect(typeof result!.phone).toBe('string');
    expect(typeof result!.is_active).toBe('boolean');
    expect(typeof result!.rating).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Test nullable fields when null
    if (result!.description === null) {
      expect(result!.description).toBeNull();
    } else {
      expect(typeof result!.description).toBe('string');
    }
    
    if (result!.image_url === null) {
      expect(result!.image_url).toBeNull();
    } else {
      expect(typeof result!.image_url).toBe('string');
    }
  });
});