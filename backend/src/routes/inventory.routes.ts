import { Router } from "express";

import {
    entry,
    exit,
    adjustment,
    movements,
    history,
    lowStock
} from "../controllers/inventory.controller";


const router = Router();


// =====================================================
// INVENTORY ENTRY
// =====================================================

router.post(
    "/entry",
    entry
);


// =====================================================
// INVENTORY EXIT
// =====================================================

router.post(
    "/exit",
    exit
);


// =====================================================
// INVENTORY ADJUSTMENT
// =====================================================

router.post(
    "/adjustment",
    adjustment
);


// =====================================================
// INVENTORY MOVEMENTS
// =====================================================

router.get(
    "/movements",
    movements
);


// =====================================================
// LOW STOCK
// =====================================================

router.get(
    "/low-stock",
    lowStock
);


// =====================================================
// COMPONENT HISTORY
// =====================================================

router.get(
    "/:id/history",
    history
);


export default router;