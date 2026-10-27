import {
    Router
} from "express";

import {
    getDashboard
} from "../controllers/dashboard.controller";


const router = Router();


// ======================================================
// DASHBOARD
// ======================================================

router.get(
    "/",
    getDashboard
);


export default router;