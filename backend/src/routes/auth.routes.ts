import { Router } from "express";

import {
    login,
    logout,
    me,
    verifyCode
} from "../controllers/auth.controller";

import {
    authenticate
} from "../middleware/auth.middleware";


const router =
    Router();


// =====================================================
// PUBLIC AUTH
// =====================================================

router.post(
    "/login",
    login
);

router.post(
    "/verify-code",
    verifyCode
);


// =====================================================
// AUTHENTICATED
// =====================================================

router.get(
    "/me",
    authenticate,
    me
);

router.post(
    "/logout",
    logout
);


export default router;
