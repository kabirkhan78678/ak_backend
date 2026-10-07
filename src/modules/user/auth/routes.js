import express from "express";
import * as AuthController from "./controller.js";
import { authenticateUser } from "../../../core/middleware/auth-middleware.js";
import { localUploaderFields } from "../../../utility/upload/multerUpload.js";

const router = express.Router();

router.post("/signup", AuthController.userSignup);
router.post("/login", AuthController.userLogin);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", authenticateUser, AuthController.changePassword);

router.get("/profile", authenticateUser, AuthController.getProfile);
router.put(
    "/update-profile",
    authenticateUser,
    localUploaderFields("profiles", [
        { name: "profile_image", maxCount: 1 }
    ]),
    AuthController.updateProfile
);
router.delete("/delete-user", authenticateUser, AuthController.deleteUser);

export default router;
