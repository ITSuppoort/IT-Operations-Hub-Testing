// =====================================================
// IT OPERATIONS HUB
// HISTORY ROUTES
// =====================================================

import { Router } from "express";

import {
    list,
    listByType,
    recent
} from "../controllers/history.controller";


const router = Router();


// =====================================================
// GET COMPLETE HISTORY
// =====================================================

router.get(
    "/",
    list
);


// =====================================================
// GET RECENT HISTORY
// =====================================================
//
// Example:
// GET /history/recent
// GET /history/recent?limit=10
//

router.get(
    "/recent",
    recent
);


// =====================================================
// GET HISTORY BY TYPE
// =====================================================
//
// Examples:
//
// /history/type/EQUIPMENT_MOVEMENT
// /history/type/DAMAGE
// /history/type/INVENTORY_MOVEMENT
// /history/type/SECURITY
//

router.get(
    "/type/:type",
    listByType
);


export default router;