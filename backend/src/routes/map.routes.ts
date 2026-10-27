import { Router } from "express";

import {

    createLocationController,
    listLocations,
    getLocation,
    updateLocationController,
    deleteLocationController,

    createAreaController,
    listAreas,
    getArea,
    updateAreaController,
    deleteAreaController,

    createPositionController,
    listPositions,
    getPosition,
    updatePositionController,
    deletePositionController

} from "../controllers/map.controller";


const router = Router();


// =====================================================
// LOCATIONS
// =====================================================

router.post(
    "/locations",
    createLocationController
);

router.get(
    "/locations",
    listLocations
);

router.get(
    "/locations/:id",
    getLocation
);

router.put(
    "/locations/:id",
    updateLocationController
);

router.delete(
    "/locations/:id",
    deleteLocationController
);


// =====================================================
// AREAS
// =====================================================

router.post(
    "/areas",
    createAreaController
);

router.get(
    "/areas",
    listAreas
);

router.get(
    "/areas/:id",
    getArea
);

router.put(
    "/areas/:id",
    updateAreaController
);

router.delete(
    "/areas/:id",
    deleteAreaController
);


// =====================================================
// POSITIONS
// =====================================================

router.post(
    "/positions",
    createPositionController
);

router.get(
    "/positions",
    listPositions
);

router.get(
    "/positions/:id",
    getPosition
);

router.put(
    "/positions/:id",
    updatePositionController
);

router.delete(
    "/positions/:id",
    deletePositionController
);


export default router;