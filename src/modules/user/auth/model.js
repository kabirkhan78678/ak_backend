import { execute, getOne } from "../../../core/db-helper.js";

// Save reset token
export const saveResetToken = async (email, token, expiry) => {
    return execute(
        `UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?`,
        [token, expiry, email]
    );
};

// Get user by reset token
export const getUserByResetToken = async (token) => {
    return getOne(
        `SELECT id FROM users 
     WHERE reset_token=? AND reset_token_expiry > NOW()`,
        [token]
    );
};

// 🔍 Get user password by ID
export const getUserPasswordById = async (id) => {
    return getOne(
        `SELECT password FROM users WHERE id=?`,
        [id]
    );
};