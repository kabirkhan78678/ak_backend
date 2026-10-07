import Joi from "joi";

export const createSellerSchema = Joi.object({
  user_id: Joi.number().integer().required(),
  store_name: Joi.string().min(2).max(255).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  business_address: Joi.string().allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  state: Joi.string().max(100).allow(null, ""),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).allow(null, ""),
  gst_number: Joi.string().pattern(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3})$/).allow(null, ""),
  kyc_status: Joi.string().valid("pending", "verified", "rejected").default("pending"),
  status: Joi.string().valid("active", "inactive").default("active"),
});

export const updateSellerSchema = Joi.object({
  store_name: Joi.string().min(2).max(255),
  phone: Joi.string().pattern(/^[0-9]{10}$/),
  business_address: Joi.string().allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  state: Joi.string().max(100).allow(null, ""),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).allow(null, ""),
  gst_number: Joi.string().pattern(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3})$/).allow(null, ""),
  kyc_status: Joi.string().valid("pending", "verified", "rejected"),
  status: Joi.string().valid("active", "inactive"),
});
