import { Router } from "express";

import {
    create,
    list,
    getOne,
    update,
    remove
} from "../controllers/configuration.controller";


const router = Router();


// =====================================================
// CONFIGURATION ROUTES
// =====================================================


// CREATE
router.post(
    "/",
    create
);


// LIST
router.get(
    "/",
    list
);


// GET BY KEY
router.get(
    "/:key",
    getOne
);


// UPDATE
router.put(
    "/:key",
    update
);


// DELETE
router.delete(
    "/:key",
    remove
);


export default router;