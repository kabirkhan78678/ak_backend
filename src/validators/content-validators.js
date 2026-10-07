import Joi from "joi";

export const createPostSchema = Joi.object({
    text_content: Joi.string().allow("", null),
    post_type: Joi.string().valid("text", "image", "video").optional()
});

export const updatePostSchema = Joi.object({
    text_content: Joi.string().allow("", null)
});
