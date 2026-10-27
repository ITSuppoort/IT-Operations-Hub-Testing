import { Request, Response } from "express";

import {
    createLocation,
    getLocations,
    getLocationById,
    updateLocation,
    deleteLocation,

    createArea,
    getAreas,
    getAreaById,
    updateArea,
    deleteArea,

    createPosition,
    getPositions,
    getPositionById,
    updatePosition,
    deletePosition
} from "../services/map.service";


// =====================================================
// LOCATIONS
// =====================================================

// CREATE LOCATION

export async function createLocationController(
    req: Request,
    res: Response
) {

    try {

        const location = await createLocation(
            req.body
        );

        return res.status(201).json(location);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating location"
        });

    }

}


// GET ALL LOCATIONS

export async function listLocations(
    req: Request,
    res: Response
) {

    try {

        const locations = await getLocations();

        return res.json(locations);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading locations"
        });

    }

}


// GET LOCATION BY ID

export async function getLocation(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const location = await getLocationById(
            id
        );

        if (!location) {

            return res.status(404).json({
                message: "Location not found"
            });

        }

        return res.json(location);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading location"
        });

    }

}


// UPDATE LOCATION

export async function updateLocationController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const location = await updateLocation(
            id,
            req.body
        );

        return res.json(location);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error updating location"
        });

    }

}


// DELETE LOCATION

export async function deleteLocationController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        await deleteLocation(
            id
        );

        return res.json({
            message: "Location deleted"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error deleting location"
        });

    }

}


// =====================================================
// AREAS
// =====================================================

// CREATE AREA

export async function createAreaController(
    req: Request,
    res: Response
) {

    try {

        const area = await createArea(
            req.body
        );

        return res.status(201).json(area);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating area"
        });

    }

}


// GET ALL AREAS

export async function listAreas(
    req: Request,
    res: Response
) {

    try {

        const areas = await getAreas();

        return res.json(areas);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading areas"
        });

    }

}


// GET AREA BY ID

export async function getArea(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const area = await getAreaById(
            id
        );

        if (!area) {

            return res.status(404).json({
                message: "Area not found"
            });

        }

        return res.json(area);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading area"
        });

    }

}


// UPDATE AREA

export async function updateAreaController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const area = await updateArea(
            id,
            req.body
        );

        return res.json(area);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error updating area"
        });

    }

}


// DELETE AREA

export async function deleteAreaController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        await deleteArea(
            id
        );

        return res.json({
            message: "Area deleted"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error deleting area"
        });

    }

}


// =====================================================
// POSITIONS
// =====================================================

// CREATE POSITION

export async function createPositionController(
    req: Request,
    res: Response
) {

    try {

        const position = await createPosition(
            req.body
        );

        return res.status(201).json(position);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating position"
        });

    }

}


// GET ALL POSITIONS

export async function listPositions(
    req: Request,
    res: Response
) {

    try {

        const positions = await getPositions();

        return res.json(positions);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading positions"
        });

    }

}


// GET POSITION BY ID

export async function getPosition(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const position = await getPositionById(
            id
        );

        if (!position) {

            return res.status(404).json({
                message: "Position not found"
            });

        }

        return res.json(position);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading position"
        });

    }

}


// UPDATE POSITION

export async function updatePositionController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const position = await updatePosition(
            id,
            req.body
        );

        return res.json(position);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error updating position"
        });

    }

}


// DELETE POSITION

export async function deletePositionController(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        await deletePosition(
            id
        );

        return res.json({
            message: "Position deleted"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error deleting position"
        });

    }

}