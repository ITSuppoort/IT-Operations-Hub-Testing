import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

// =====================================================
// IT OPERATIONS HUB
// CONFIGURATION SERVICE
// =====================================================

export interface CreateConfigurationData {
    key: string;
    category: string;
    value: Prisma.InputJsonValue;
    description?: string;
    isEditable?: boolean;
    updatedById?: string;
}

export interface UpdateConfigurationData {
    category?: string;
    value?: Prisma.InputJsonValue;
    description?: string;
    isEditable?: boolean;
    updatedById?: string;
}

// =====================================================
// CREATE CONFIGURATION
// =====================================================

export async function createConfiguration(
    data: CreateConfigurationData
) {
    return prisma.configuration.create({
        data: {
            key: data.key,
            category: data.category,
            value: data.value,
            description: data.description,
            isEditable: data.isEditable ?? true,
            updatedById: data.updatedById
        }
    });
}

// =====================================================
// GET ALL CONFIGURATIONS
// =====================================================

export async function getConfigurations() {
    return prisma.configuration.findMany({
        orderBy: [
            {
                category: "asc"
            },
            {
                key: "asc"
            }
        ],
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// GET CONFIGURATION BY ID
// =====================================================

export async function getConfigurationById(
    id: string
) {
    return prisma.configuration.findUnique({
        where: {
            id
        },
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// GET CONFIGURATION BY KEY
// =====================================================

export async function getConfigurationByKey(
    key: string
) {
    return prisma.configuration.findUnique({
        where: {
            key
        },
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// GET CONFIGURATIONS BY CATEGORY
// =====================================================

export async function getConfigurationsByCategory(
    category: string
) {
    return prisma.configuration.findMany({
        where: {
            category
        },
        orderBy: {
            key: "asc"
        },
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// UPDATE CONFIGURATION BY KEY
// =====================================================

export async function updateConfiguration(
    key: string,
    data: UpdateConfigurationData
) {
    const existing =
        await prisma.configuration.findUnique({
            where: {
                key
            }
        });

    if (!existing) {
        throw new Error(
            "CONFIGURATION_NOT_FOUND"
        );
    }

    if (existing.isEditable === false) {
        throw new Error(
            "CONFIGURATION_NOT_EDITABLE"
        );
    }

    return prisma.configuration.update({
        where: {
            key
        },
        data: {
            ...(data.category !== undefined && {
                category: data.category
            }),

            ...(data.value !== undefined && {
                value: data.value
            }),

            ...(data.description !== undefined && {
                description: data.description
            }),

            ...(data.isEditable !== undefined && {
                isEditable: data.isEditable
            }),

            ...(data.updatedById !== undefined && {
                updatedById: data.updatedById
            })
        },
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// UPDATE CONFIGURATION BY ID
// =====================================================

export async function updateConfigurationById(
    id: string,
    data: UpdateConfigurationData
) {
    const existing =
        await prisma.configuration.findUnique({
            where: {
                id
            }
        });

    if (!existing) {
        throw new Error(
            "CONFIGURATION_NOT_FOUND"
        );
    }

    if (existing.isEditable === false) {
        throw new Error(
            "CONFIGURATION_NOT_EDITABLE"
        );
    }

    return prisma.configuration.update({
        where: {
            id
        },
        data: {
            ...(data.category !== undefined && {
                category: data.category
            }),

            ...(data.value !== undefined && {
                value: data.value
            }),

            ...(data.description !== undefined && {
                description: data.description
            }),

            ...(data.isEditable !== undefined && {
                isEditable: data.isEditable
            }),

            ...(data.updatedById !== undefined && {
                updatedById: data.updatedById
            })
        },
        include: {
            updatedBy: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
}

// =====================================================
// DELETE CONFIGURATION BY KEY
// =====================================================

export async function deleteConfiguration(
    key: string
) {
    const existing =
        await prisma.configuration.findUnique({
            where: {
                key
            }
        });

    if (!existing) {
        throw new Error(
            "CONFIGURATION_NOT_FOUND"
        );
    }

    if (existing.isEditable === false) {
        throw new Error(
            "CONFIGURATION_NOT_EDITABLE"
        );
    }

    return prisma.configuration.delete({
        where: {
            key
        }
    });
}

// =====================================================
// DELETE CONFIGURATION BY ID
// =====================================================

export async function deleteConfigurationById(
    id: string
) {
    const existing =
        await prisma.configuration.findUnique({
            where: {
                id
            }
        });

    if (!existing) {
        throw new Error(
            "CONFIGURATION_NOT_FOUND"
        );
    }

    if (existing.isEditable === false) {
        throw new Error(
            "CONFIGURATION_NOT_EDITABLE"
        );
    }

    return prisma.configuration.delete({
        where: {
            id
        }
    });
}

// =====================================================
// CHECK IF CONFIGURATION EXISTS
// =====================================================

export async function configurationExists(
    key: string
) {
    const configuration =
        await prisma.configuration.findUnique({
            where: {
                key
            },
            select: {
                id: true
            }
        });

    return Boolean(configuration);
}