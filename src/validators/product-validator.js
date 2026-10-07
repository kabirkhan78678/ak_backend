import Joi from "joi";

export const productSchema = Joi.object({
  seller_id: Joi.number().required(),
  title: Joi.string().min(3).required(),
  description: Joi.string().required(),
  price: Joi.number().required(),
  currency: Joi.string().default("CHF"),
  stock: Joi.number().default(0),
  status: Joi.string().valid("draft", "published", "archived").default("draft"),
  metadata: Joi.any()
});

export const validateProduct = (req, res, next) => {
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};

