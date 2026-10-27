import { executeEquipmentOperation } from '../controllers/equipment-operations.controller';
import { Router } from "express";

import {
    create,
    list,
    getOne,
    remove
} from "../controllers/movement.controller";


const router = Router();
router.post('/equipment-operation', executeEquipmentOperation);


// ================================
// CREATE MOVEMENT
// ================================

router.post(
    "/",
    create
);


// ================================
// GET ALL MOVEMENTS
// ================================

router.get(
    "/",
    list
);


// ================================
// GET MOVEMENT BY ID
// ================================

router.get(
    "/:id",
    getOne
);


// ================================
// DELETE MOVEMENT
// ================================

router.delete(
    "/:id",
    remove
);


export default router;