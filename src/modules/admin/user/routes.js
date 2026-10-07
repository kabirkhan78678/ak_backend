import express from "express";
import {
    getAllUsersAdminApi, getSingleUserAdminApi, getAllAssetSpreadsAdminApi, updateAssetSpreadAdminApi, deleteUserByAdmin, updateUserLeverageAdminApi
} from "./controller.js";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js"
const router = express.Router();


/**
 * ADMIN → GET ALL USERS
 */
router.get("/get-all-users", authenticateAdmin, getAllUsersAdminApi);

router.get("/users/:id", authenticateAdmin, getSingleUserAdminApi);
router.patch("/users/:id/leverage", authenticateAdmin, updateUserLeverageAdminApi);

// 🗑 DELETE USER
router.delete("/user/:userId", authenticateAdmin, deleteUserByAdmin);

router.get("/assets/spread", authenticateAdmin, getAllAssetSpreadsAdminApi);
router.patch("/assets/spread/:id", authenticateAdmin, updateAssetSpreadAdminApi);


export default router;
