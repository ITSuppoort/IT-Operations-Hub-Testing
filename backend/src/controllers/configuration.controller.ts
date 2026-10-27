import { Request, Response } from "express";

import {
    createConfiguration,
    getConfigurations,
    getConfigurationByKey,
    updateConfiguration,
    deleteConfiguration
} from "../services/configuration.service";


// =====================================================
// CREATE CONFIGURATION
// =====================================================

export async function create(
    req: Request,
    res: Response
) {

    try {

        const configuration =
            await createConfiguration(
                req.body
            );

        return res
            .status(201)
            .json(configuration);

    } catch (error) {

        console.error(
            "Error creating configuration:",
            error
        );

        return res.status(500).json({

            message:
                "Error creating configuration"

        });

    }

}


// =====================================================
// GET CONFIGURATIONS
// =====================================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const category =
            typeof req.query.category === "string"
                ? req.query.category
                : undefined;


        const configurations =
    await getConfigurations();


        return res.json(
            configurations
        );

    } catch (error) {

        console.error(
            "Error loading configurations:",
            error
        );

        return res.status(500).json({

            message:
                "Error loading configurations"

        });

    }

}


// =====================================================
// GET CONFIGURATION BY KEY
// =====================================================

export async function getOne(
    req: Request,
    res: Response
) {

    try {

        const key =
            String(req.params.key);


        const configuration =
            await getConfigurationByKey(
                key
            );


        if (!configuration) {

            return res.status(404).json({

                message:
                    "Configuration not found"

            });

        }


        return res.json(
            configuration
        );

    } catch (error) {

        console.error(
            "Error loading configuration:",
            error
        );

        return res.status(500).json({

            message:
                "Error loading configuration"

        });

    }

}


// =====================================================
// UPDATE CONFIGURATION
// =====================================================

export async function update(
    req: Request,
    res: Response
) {

    try {

        const key =
            String(req.params.key);


        const configuration =
            await updateConfiguration(
                key,
                req.body
            );


        return res.json(
            configuration
        );

    } catch (error) {

        console.error(
            "Error updating configuration:",
            error
        );


        if (
            error instanceof Error &&
            error.message ===
                "CONFIGURATION_NOT_FOUND"
        ) {

            return res.status(404).json({

                message:
                    "Configuration not found"

            });

        }


        if (
            error instanceof Error &&
            error.message ===
                "CONFIGURATION_NOT_EDITABLE"
        ) {

            return res.status(403).json({

                message:
                    "Configuration cannot be edited"

            });

        }


        return res.status(500).json({

            message:
                "Error updating configuration"

        });

    }

}


// =====================================================
// DELETE CONFIGURATION
// =====================================================

export async function remove(
    req: Request,
    res: Response
) {

    try {

        const key =
            String(req.params.key);


        await deleteConfiguration(
            key
        );


        return res.json({

            message:
                "Configuration deleted"

        });

    } catch (error) {

        console.error(
            "Error deleting configuration:",
            error
        );


        if (
            error instanceof Error &&
            error.message ===
                "CONFIGURATION_NOT_FOUND"
        ) {

            return res.status(404).json({

                message:
                    "Configuration not found"

            });

        }


        if (
            error instanceof Error &&
            error.message ===
                "CONFIGURATION_NOT_EDITABLE"
        ) {

            return res.status(403).json({

                message:
                    "Configuration cannot be deleted"

            });

        }


        return res.status(500).json({

            message:
                "Error deleting configuration"

        });

    }

}