import Joi from "joi";

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});


export const adminChangePasswordSchema = Joi.object({
  old_password: Joi.string().min(6),
  reset_token: Joi.string(),
  new_password: Joi.string().min(6).required()
})
  .or("old_password", "reset_token").messages({
    "object.missing": "Either old_password or reset_token is required"
  });
