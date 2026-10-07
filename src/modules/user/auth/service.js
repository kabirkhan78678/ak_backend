import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getOne, execute } from "../../../core/db-helper.js";
import { saveResetToken, getUserByResetToken, getUserPasswordById } from "./model.js";
import { sendEmail } from "../../../utility/emails/sendEmail.js";
import { emailLayout } from "../../../utility/emails/layout.js";

// Helpers
const genUsername = (f, l) =>
  `${f}.${l}${Math.floor(1000 + Math.random() * 9000)}`.toLowerCase();

/**
 * SIGNUP
 */
export const userSignup = async (data) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    password,
    country,
    account_type,
    leverage
  } = data;

  if (await getOne(`SELECT id FROM users WHERE email=?`, [email]))
    throw new Error("Email already registered");

  if (await getOne(`SELECT id FROM users WHERE phone=?`, [phone]))
    throw new Error("Phone already registered");

  const plainPassword = password || crypto.randomBytes(6).toString("hex");
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const username = genUsername(first_name, last_name);

  const result = await execute(
    `INSERT INTO users 
     (first_name,last_name,email,phone,country,account_type,leverage,username,password,plain_password)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      first_name,
      last_name,
      email,
      phone,
      country,
      account_type,
      leverage,
      username,
      hashedPassword,
      plainPassword
    ]
  );

  await execute(
    `INSERT INTO wallets (user_id,balance,free_margin,used_margin)
     VALUES (?,0,0,0)`,
    [result.insertId]
  );

  sendEmail(
    email,
    "Welcome to OneTradeFX",
    emailLayout(
      "Account Created 🎉",
      `<p><b>Username:</b> ${username}</p>
     <p><b>Password:</b> ${plainPassword}</p>`
    )
  ).catch(err => {
    console.error("Email failed:", err.message);
  });

  return { id: result.insertId, username, email, account_type, leverage };
};

/**
 * LOGIN
 */
export const userLogin = async ({ login, password }) => {
  const user = await getOne(
    `SELECT id,first_name,last_name,email,username,password
     FROM users WHERE email=? OR username=?`,
    [login, login]
  );

  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new Error("Invalid credentials");

  const token = jwt.sign(
    { user_id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  delete user.password;
  return { token, user };
};

/**
 * FORGOT PASSWORD
 */
export const forgotPassword = async ({ email }) => {
  const user = await getOne(`SELECT id FROM users WHERE email=?`, [email]);
  if (!user) throw new Error("Email not registered");

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await saveResetToken(email, token, expiry);

  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  console.log("xxxxxxxx", link)

  sendEmail(
    email,
    "Reset Password",
    emailLayout(
      "Password Reset",
      `<a href="${link}">Reset Password</a><p>Valid for 15 minutes</p>`
    )
  );

  return { message: "Reset link sent" };
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async ({ token, new_password }) => {
  const user = await getUserByResetToken(token);
  if (!user) throw new Error("Invalid or expired token");

  const hashed = await bcrypt.hash(new_password, 10);

  await execute(
    `UPDATE users 
     SET password=?,plain_password=? , reset_token=NULL, reset_token_expiry=NULL
     WHERE id=?`,
    [hashed, user.id]
  );

  return { message: "Password updated" };
};

/* ================= GET PROFILE ================= */
export const getProfile = async (userId) => {
  const user = await getOne(
    `
    SELECT 
      id,
      first_name,
      last_name,
      email,
      phone,
      country,
      username,
      leverage,
      profile_image
    FROM users
    WHERE id=?
    `,
    [userId]
  );

  if (!user) throw new Error("User not found");

  const baseUrl =
    process.env.FILE_BASE_URL || process.env.APP_URL || "";

  return {
    ...user,
    profile_image: user.profile_image
      ? `${baseUrl}/${user.profile_image}`
      : null
  };
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (userId, data, files) => {
  let profileImage = null;

  if (files?.profile_image?.length) {
    profileImage = files.profile_image[0].filePath;
  }

  await execute(
    `
    UPDATE users SET
      first_name=?,
      last_name=?,
      phone=?,
      country=?,
      profile_image=COALESCE(?, profile_image)
    WHERE id=?
    `,
    [
      data.first_name,
      data.last_name,
      data.phone,
      data.country,
      profileImage,
      userId
    ]
  );

  return { message: "Profile updated successfully" };
};

/**
 * DELETE USER
 */
export const removeUser = async (userId) => {
  // 1️⃣ Delete FK dependencies first
  await execute(
    `DELETE FROM deposit_confirmations 
     WHERE deposit_id IN (
        SELECT id FROM deposits WHERE user_id = ?
     )`,
    [userId]
  );

  // deposits
  await execute(`DELETE FROM deposits WHERE user_id=?`, [userId]);

  // withdrawals
  await execute(`DELETE FROM withdrawal_requests WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM withdrawal_history WHERE user_id=?`, [userId]);

  // trading
  await execute(`DELETE FROM trades WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM portfolios WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM watchlists WHERE user_id=?`, [userId]);

  // wallet & kyc
  await execute(`DELETE FROM wallets WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM bank_accounts WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM user_kyc WHERE user_id=?`, [userId]);

  // 2️⃣ Delete user record
  await execute(`DELETE FROM users WHERE id=?`, [userId]);
  return { message: "User deleted successfully" };
};



/**
 * 🔐 CHANGE PASSWORD (Logged-in User)
 */
export const changePassword = async (userId, { old_password, new_password }) => {
  if (!old_password || !new_password) {
    throw new Error("Old password and new password are required");
  }

  // 1️⃣ Get current password hash
  const user = await getUserPasswordById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // 2️⃣ Verify old password
  const match = await bcrypt.compare(old_password, user.password);
  if (!match) {
    throw new Error("Old password is incorrect");
  }

  // 3️⃣ Hash new password
  const hashed = await bcrypt.hash(new_password, 8);

  // 4️⃣ Update BOTH hashed & plain password
  await execute(
    `UPDATE users SET password=?, plain_password=? WHERE id=?`,
    [hashed, new_password, userId]
  );

  return { message: "Password changed successfully" };
};
