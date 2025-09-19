import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username || null,
        phone: input.phone,
        role: input.role,
        full_name: input.full_name,
        avatar_url: null,
        is_active: true
      })
      .returning()
      .execute();

    // Return the created user
    const user = result[0];
    return user;
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};