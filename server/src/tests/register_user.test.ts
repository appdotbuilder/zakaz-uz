import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Valid test input for customer registration
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  phone: '+998901234567',
  role: 'customer',
  full_name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.phone).toEqual('+998901234567');
    expect(result.role).toEqual('customer');
    expect(result.full_name).toEqual('Test User');
    expect(result.avatar_url).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query the database to verify the user was created
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].phone).toEqual('+998901234567');
    expect(users[0].role).toEqual('customer');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].is_active).toBe(true);
  });

  it('should create a shop user', async () => {
    const shopInput: RegisterUserInput = {
      ...testInput,
      email: 'shop@example.com',
      username: 'shopuser',
      role: 'shop',
      full_name: 'Shop Owner'
    };

    const result = await registerUser(shopInput);

    expect(result.email).toEqual('shop@example.com');
    expect(result.username).toEqual('shopuser');
    expect(result.role).toEqual('shop');
    expect(result.full_name).toEqual('Shop Owner');
  });

  it('should create a courier user', async () => {
    const courierInput: RegisterUserInput = {
      ...testInput,
      email: 'courier@example.com',
      username: 'courieruser',
      role: 'courier',
      full_name: 'Courier User'
    };

    const result = await registerUser(courierInput);

    expect(result.email).toEqual('courier@example.com');
    expect(result.username).toEqual('courieruser');
    expect(result.role).toEqual('courier');
    expect(result.full_name).toEqual('Courier User');
  });

  it('should create a user with null username', async () => {
    const inputWithoutUsername: RegisterUserInput = {
      email: 'nouser@example.com',
      password: 'password123',
      phone: '+998907654321',
      role: 'customer',
      full_name: 'User Without Username'
    };

    const result = await registerUser(inputWithoutUsername);

    expect(result.email).toEqual('nouser@example.com');
    expect(result.username).toBeNull();
    expect(result.phone).toEqual('+998907654321');
    expect(result.full_name).toEqual('User Without Username');
  });

  it('should handle Uzbek phone number formats', async () => {
    const phoneVariations = [
      '+998901234567',
      '998901234567',
      '0901234567'
    ];

    for (let i = 0; i < phoneVariations.length; i++) {
      const phoneInput: RegisterUserInput = {
        email: `phone${i}@example.com`,
        username: `phoneuser${i}`,
        password: 'password123',
        phone: phoneVariations[i],
        role: 'customer',
        full_name: `Phone User ${i}`
      };

      const result = await registerUser(phoneInput);
      expect(result.phone).toEqual(phoneVariations[i]);
    }
  });

  it('should fail with duplicate email', async () => {
    // Create first user
    await registerUser(testInput);

    // Attempt to create second user with same email
    const duplicateEmailInput: RegisterUserInput = {
      ...testInput,
      username: 'differentuser',
      phone: '+998907654321'
    };

    await expect(registerUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value/i);
  });

  it('should fail with duplicate username', async () => {
    // Create first user
    await registerUser(testInput);

    // Attempt to create second user with same username
    const duplicateUsernameInput: RegisterUserInput = {
      ...testInput,
      email: 'different@example.com',
      phone: '+998907654321'
    };

    await expect(registerUser(duplicateUsernameInput))
      .rejects.toThrow(/duplicate key value/i);
  });

  it('should fail with duplicate phone', async () => {
    // Create first user
    await registerUser(testInput);

    // Attempt to create second user with same phone
    const duplicatePhoneInput: RegisterUserInput = {
      ...testInput,
      email: 'different@example.com',
      username: 'differentuser'
    };

    await expect(registerUser(duplicatePhoneInput))
      .rejects.toThrow(/duplicate key value/i);
  });

  it('should fail with invalid phone format', async () => {
    const invalidPhoneInput: RegisterUserInput = {
      ...testInput,
      phone: '123456789' // Invalid format
    };

    await expect(registerUser(invalidPhoneInput))
      .rejects.toThrow(/violates check constraint/i);
  });

  it('should create multiple users with valid data', async () => {
    const users = [
      {
        email: 'user1@example.com',
        username: 'user1',
        phone: '+998901111111',
        full_name: 'User One'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        phone: '+998902222222',
        full_name: 'User Two'
      },
      {
        email: 'user3@example.com',
        username: 'user3',
        phone: '+998903333333',
        full_name: 'User Three'
      }
    ];

    for (const userData of users) {
      const input: RegisterUserInput = {
        ...userData,
        password: 'password123',
        role: 'customer'
      };

      const result = await registerUser(input);
      expect(result.email).toEqual(userData.email);
      expect(result.username).toEqual(userData.username);
      expect(result.phone).toEqual(userData.phone);
      expect(result.full_name).toEqual(userData.full_name);
    }

    // Verify all users were created in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
  });
});