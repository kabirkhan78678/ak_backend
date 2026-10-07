import db from "../config/db.js";

/**
 * Fetch single row
 */
export const getOne = async (sql, params = []) => {
  const rows = await db.query(sql, params);
  return rows[0] || null;
};

/**
 * Fetch multiple rows
 */
export const getAll = async (sql, params = []) => {
  return db.query(sql, params);
};

/**
 * Execute insert / update / delete
 */
export const execute = async (sql, params = []) => {
  return db.query(sql, params);
};

export const deleteData = async (table, where) => {
  return execute(`DELETE FROM ${table} ${where}`);
};

export const getSelectedColumn = async (columns, table, where = "") => {
  return getAll(`SELECT ${columns} FROM ${table} ${where}`);
};