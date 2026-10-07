import Joi from "joi";

export const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  username: Joi.string().min(3).max(50).optional(),
  profile_image: Joi.string().uri().optional(),
  gender: Joi.string().valid("male", "female", "other").optional(),
  dob: Joi.date().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
//   user_id: Joi.number().optional()
});
