import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, productCategoriesTable, productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all products when no filters are provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '998901234567'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();

    // Create test products
    const [product1] = await db.insert(productsTable)
      .values({
        shop_id: shop.id,
        category_id: category.id,
        name: 'Product 1',
        price: '19.99',
        quantity: 10
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        shop_id: shop.id,
        category_id: category.id,
        name: 'Product 2',
        price: '25.50',
        quantity: 5
      })
      .returning()
      .execute();

    const results = await getProducts();

    expect(results).toHaveLength(2);
    expect(results[0].name).toEqual('Product 1');
    expect(results[0].price).toEqual(19.99);
    expect(typeof results[0].price).toBe('number');
    expect(results[1].name).toEqual('Product 2');
    expect(results[1].price).toEqual(25.50);
    expect(typeof results[1].price).toBe('number');
  });

  it('should filter products by shop_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create two test shops
    const [shop1] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Shop 1',
        address: 'Address 1',
        phone: '998901234567'
      })
      .returning()
      .execute();

    const [shop2] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Shop 2',
        address: 'Address 2',
        phone: '998901234568'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();

    // Create products for both shops
    await db.insert(productsTable)
      .values([
        {
          shop_id: shop1.id,
          category_id: category.id,
          name: 'Shop 1 Product',
          price: '15.00',
          quantity: 10
        },
        {
          shop_id: shop2.id,
          category_id: category.id,
          name: 'Shop 2 Product',
          price: '20.00',
          quantity: 5
        }
      ])
      .execute();

    const results = await getProducts(shop1.id);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Shop 1 Product');
    expect(results[0].shop_id).toEqual(shop1.id);
    expect(results[0].price).toEqual(15.00);
  });

  it('should filter products by category_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '998901234567'
      })
      .returning()
      .execute();

    // Create two test categories
    const [category1] = await db.insert(productCategoriesTable)
      .values({
        name: 'Category 1'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(productCategoriesTable)
      .values({
        name: 'Category 2'
      })
      .returning()
      .execute();

    // Create products for both categories
    await db.insert(productsTable)
      .values([
        {
          shop_id: shop.id,
          category_id: category1.id,
          name: 'Category 1 Product',
          price: '12.99',
          quantity: 8
        },
        {
          shop_id: shop.id,
          category_id: category2.id,
          name: 'Category 2 Product',
          price: '18.99',
          quantity: 3
        }
      ])
      .execute();

    const results = await getProducts(undefined, category1.id);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Category 1 Product');
    expect(results[0].category_id).toEqual(category1.id);
    expect(results[0].price).toEqual(12.99);
  });

  it('should filter products by both shop_id and category_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create two test shops
    const [shop1] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Shop 1',
        address: 'Address 1',
        phone: '998901234567'
      })
      .returning()
      .execute();

    const [shop2] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Shop 2',
        address: 'Address 2',
        phone: '998901234568'
      })
      .returning()
      .execute();

    // Create two test categories
    const [category1] = await db.insert(productCategoriesTable)
      .values({
        name: 'Category 1'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(productCategoriesTable)
      .values({
        name: 'Category 2'
      })
      .returning()
      .execute();

    // Create products for different shop/category combinations
    await db.insert(productsTable)
      .values([
        {
          shop_id: shop1.id,
          category_id: category1.id,
          name: 'Shop 1 Category 1 Product',
          price: '10.00',
          quantity: 5
        },
        {
          shop_id: shop1.id,
          category_id: category2.id,
          name: 'Shop 1 Category 2 Product',
          price: '15.00',
          quantity: 3
        },
        {
          shop_id: shop2.id,
          category_id: category1.id,
          name: 'Shop 2 Category 1 Product',
          price: '20.00',
          quantity: 7
        }
      ])
      .execute();

    const results = await getProducts(shop1.id, category1.id);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Shop 1 Category 1 Product');
    expect(results[0].shop_id).toEqual(shop1.id);
    expect(results[0].category_id).toEqual(category1.id);
    expect(results[0].price).toEqual(10.00);
  });

  it('should return empty array when no products match filters', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '998901234567'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();

    // Create a product
    await db.insert(productsTable)
      .values({
        shop_id: shop.id,
        category_id: category.id,
        name: 'Test Product',
        price: '10.00',
        quantity: 5
      })
      .execute();

    // Search for non-existent shop (using proper UUID format)
    const results = await getProducts('00000000-0000-0000-0000-000000000000');

    expect(results).toHaveLength(0);
  });

  it('should return empty array when no products exist', async () => {
    const results = await getProducts();

    expect(results).toHaveLength(0);
  });

  it('should handle products with all field types correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '998901234567',
        role: 'shop',
        full_name: 'Test Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: user.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '998901234567'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();

    // Create product with all fields
    const [product] = await db.insert(productsTable)
      .values({
        shop_id: shop.id,
        category_id: category.id,
        name: 'Complete Product',
        description: 'A complete product description',
        price: '99.99',
        image_url: 'https://example.com/image.jpg',
        quantity: 25,
        is_available: true,
        rating: 4.5
      })
      .returning()
      .execute();

    const results = await getProducts();

    expect(results).toHaveLength(1);
    const result = results[0];
    
    expect(result.id).toEqual(product.id);
    expect(result.shop_id).toEqual(shop.id);
    expect(result.category_id).toEqual(category.id);
    expect(result.name).toEqual('Complete Product');
    expect(result.description).toEqual('A complete product description');
    expect(result.price).toEqual(99.99);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.quantity).toEqual(25);
    expect(result.is_available).toBe(true);
    expect(result.rating).toEqual(4.5);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});