import Joi from "joi";

export const signupSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  country: Joi.string().required(),
  account_type: Joi.string().required(),
  leverage: Joi.string().required()
});