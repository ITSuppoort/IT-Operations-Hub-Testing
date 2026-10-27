import { Router } from "express";

import {
    create,
    list,
    getOne,
    update,
    remove,
    registerIndividual,
    patchDamageMetadata,
    transitionDamage,
    getDamageHistory
} from "../controllers/damage.controller";


const router = Router();


router.post("/register-individual", registerIndividual);
router.patch("/:id/metadata", patchDamageMetadata);
router.post("/:id/transition", transitionDamage);
router.get("/:id/history", getDamageHistory);

// ================================
// CREATE DAMAGE
// ================================

router.post(
    "/",
    create
);


// ================================
// GET ALL DAMAGES
// ================================

router.get(
    "/",
    list
);


// ================================
// GET DAMAGE BY ID
// ================================

router.get(
    "/:id",
    getOne
);


// ================================
// UPDATE DAMAGE
// ================================

router.put(
    "/:id",
    update
);


// ================================
// DELETE DAMAGE
// ================================

router.delete(
    "/:id",
    remove,
    registerIndividual,
    patchDamageMetadata,
    transitionDamage,
    getDamageHistory
);


export default router;