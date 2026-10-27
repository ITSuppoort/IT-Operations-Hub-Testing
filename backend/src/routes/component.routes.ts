import { Router } from "express";

import {
    create,
    list,
    getOne,
    update,
    remove
} from "../controllers/component.controller";


const router = Router();


// ================================
// CREATE COMPONENT
// ================================

router.post(
    "/",
    create
);


// ================================
// GET ALL COMPONENTS
// ================================

router.get(
    "/",
    list
);


// ================================
// GET COMPONENT BY ID
// ================================

router.get(
    "/:id",
    getOne
);


// ================================
// UPDATE COMPONENT
// ================================

router.put(
    "/:id",
    update
);


// ================================
// DELETE COMPONENT
// ================================

router.delete(
    "/:id",
    remove
);


export default router;