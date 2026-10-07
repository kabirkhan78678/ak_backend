import { getAll, getOne, execute } from "../../../core/db-helper.js";

/* =========================
   INSERT QR
========================= */
export const insertQr = (image, upi) => {
    return execute(`
    INSERT INTO payment_qr_codes (image, upi_address, is_active)
    VALUES (?, ?, 0)
  `, [image, upi]);
};

/* =========================
   GET ALL QR (ADMIN)
========================= */
export const getAllQr = () => {
    return getAll(`
    SELECT *
    FROM payment_qr_codes
    ORDER BY id DESC
  `);
};

/* =========================
   DEACTIVATE ALL QR
========================= */
export const deactivateAllQr = () => {
    return execute(`
    UPDATE payment_qr_codes
    SET is_active = 0
    WHERE is_active = 1
  `);
};

/* =========================
   ACTIVATE QR BY ID
========================= */
export const activateQrById = (id) => {
    return execute(`
    UPDATE payment_qr_codes
    SET is_active = 1
    WHERE id = ?
  `, [id]);
};

/* =========================
   DELETE QR
========================= */
export const deleteQr = (id) => {
    return execute(`
    DELETE FROM payment_qr_codes
    WHERE id = ?
  `, [id]);
};

/* =========================
   GET ACTIVE QR (USER)
========================= */
export const getActiveQr = () => {
    return getOne(`
    SELECT image, upi_address
    FROM payment_qr_codes
    WHERE is_active = 1
    LIMIT 1
  `);
};
