import { Router } from "express";

import {
    general,
    equipment,
    components,
    damages,
    movements,
    positions
} from "../controllers/report.controller";


const router = Router();


// =====================================================
// GENERAL REPORT
// =====================================================

router.get(
    "/",
    general
);


// =====================================================
// EQUIPMENT REPORT
// =====================================================

router.get(
    "/equipment",
    equipment
);


// =====================================================
// COMPONENT REPORT
// =====================================================

router.get(
    "/components",
    components
);


// =====================================================
// DAMAGE REPORT
// =====================================================

router.get(
    "/damages",
    damages
);


// =====================================================
// MOVEMENT REPORT
// =====================================================

router.get(
    "/movements",
    movements
);


// =====================================================
// POSITION REPORT
// =====================================================

router.get(
    "/positions",
    positions
);


export default router;