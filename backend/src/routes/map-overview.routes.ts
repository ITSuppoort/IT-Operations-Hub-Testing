import { Router } from "express";

import {
    overview,
    summary
} from "../controllers/map-overview.controller";


const router = Router();


// =====================================================
// COMPLETE MAP OVERVIEW
// =====================================================

router.get(
    "/overview",
    overview
);


// =====================================================
// MAP SUMMARY
// =====================================================

router.get(
    "/summary",
    summary
);


export default router;