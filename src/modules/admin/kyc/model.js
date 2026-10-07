import { getAll, getOne, execute } from "../../../core/db-helper.js";

/* =========================
   GET ALL KYC REQUESTS
========================= */
export const getAllKycRequests = () => {
    return getAll(`
    SELECT
      k.id AS kyc_id,
      k.user_id,
      u.username,
      u.email,
      k.address_proof,
      k.document_proof,
      k.photo,
      k.profile_image,
      k.is_verified,
      k.is_rejected,
      k.verified_at,
      k.created_at
    FROM user_kyc k
    JOIN users u ON u.id = k.user_id
    ORDER BY k.created_at DESC
  `);
};

/* =========================
   GET SINGLE KYC
========================= */
export const getKycById = (kycId) => {
    return getOne(`
    SELECT * FROM user_kyc WHERE id = ?
  `, [kycId]);
};

/* =========================
   UPDATE KYC STATUS
========================= */
export const updateKycStatus = (kycId, isVerified, isRejected) => {
    return execute(`
    UPDATE user_kyc
    SET
      is_verified = ?,
      is_rejected = ?,
      verified_at = ?
    WHERE id = ?
  `, [
        isVerified,
        isRejected,
        isVerified ? new Date() : null,
        kycId
    ]);
};
