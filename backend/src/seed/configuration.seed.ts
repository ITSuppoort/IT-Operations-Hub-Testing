// =====================================================
// IT OPERATIONS HUB
// CONFIGURATION SEED
// =====================================================
//
// Este seed crea la configuración inicial del sistema.
//
// IMPORTANTE:
// - No guarda contraseñas ni secretos.
// - Los secretos reales deberán ir en variables de entorno.
// - Es seguro ejecutarlo más de una vez.
// - Si una configuración ya existe, se actualiza.
// =====================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// =====================================================
// CONFIGURATION DATA
// =====================================================

const configurations = [

    // -------------------------------------------------
    // SYSTEM
    // -------------------------------------------------

    {
        key: "system.name",
        value: "IT Operations Hub",
        category: "SYSTEM",
        description: "Nombre principal de la aplicación"
    },

    {
        key: "system.description",
        value: "Sistema central de operaciones e inventario IT",
        category: "SYSTEM",
        description: "Descripción general de la aplicación"
    },

    {
        key: "system.version",
        value: "1.0.0",
        category: "SYSTEM",
        description: "Versión actual de la aplicación"
    },


    // -------------------------------------------------
    // GENERAL
    // -------------------------------------------------

    {
        key: "general.language",
        value: "es",
        category: "GENERAL",
        description: "Idioma principal de la aplicación"
    },

    {
        key: "general.timezone",
        value: "America/Santo_Domingo",
        category: "GENERAL",
        description: "Zona horaria utilizada por el sistema"
    },

    {
        key: "general.dateFormat",
        value: "DD/MM/YYYY",
        category: "GENERAL",
        description: "Formato de fecha utilizado en la interfaz"
    },


    // -------------------------------------------------
    // INVENTORY
    // -------------------------------------------------

    {
        key: "inventory.autoEntryDate",
        value: "true",
        category: "INVENTORY",
        description: "Registrar automáticamente la fecha de entrada"
    },

    {
        key: "inventory.trackComponents",
        value: "true",
        category: "INVENTORY",
        description: "Activar control de componentes"
    },

    {
        key: "inventory.minimumStockEnabled",
        value: "true",
        category: "INVENTORY",
        description: "Activar control de stock mínimo"
    },

    {
        key: "inventory.stockPlanningMode",
        value: "SECURITY_STOCK",
        category: "INVENTORY",
        description: "Método utilizado para planificación de stock"
    },


    // -------------------------------------------------
    // SECURITY
    // -------------------------------------------------

    {
        key: "security.sessionExpirationHours",
        value: "8",
        category: "SECURITY",
        description: "Duración de la sesión del usuario en horas"
    },

    {
        key: "security.passwordResetExpirationMinutes",
        value: "30",
        category: "SECURITY",
        description: "Tiempo de expiración de un enlace de recuperación"
    },

    {
        key: "security.verificationCodeExpirationMinutes",
        value: "10",
        category: "SECURITY",
        description: "Tiempo de expiración del código de verificación"
    },


    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    {
        key: "email.enabled",
        value: "true",
        category: "EMAIL",
        description: "Activar notificaciones por correo"
    },

    {
        key: "email.fromAddress",
        value: "",
        category: "EMAIL",
        description: "Dirección utilizada como remitente"
    },

    {
        key: "email.backupAddress",
        value: "",
        category: "EMAIL",
        description: "Dirección de correo de respaldo para notificaciones"
    },


    // -------------------------------------------------
    // BACKUP
    // -------------------------------------------------

    {
        key: "backup.enabled",
        value: "true",
        category: "BACKUP",
        description: "Activar configuración de respaldo"
    },

    {
        key: "backup.notificationEnabled",
        value: "true",
        category: "BACKUP",
        description: "Enviar notificación cuando ocurra un backup"
    },

    {
        key: "backup.notificationEmail",
        value: "",
        category: "BACKUP",
        description: "Correo utilizado para notificaciones de backup"
    },

    {
        key: "backup.frequency",
        value: "DAILY",
        category: "BACKUP",
        description: "Frecuencia esperada del proceso de backup"
    },


    // -------------------------------------------------
    // MAP
    // -------------------------------------------------

    {
        key: "map.defaultView",
        value: "2D",
        category: "MAP",
        description: "Vista inicial del mapa"
    },

    {
        key: "map.defaultFloor",
        value: "1",
        category: "MAP",
        description: "Piso mostrado inicialmente en el mapa"
    },


    // -------------------------------------------------
    // AUDIT
    // -------------------------------------------------

    {
        key: "audit.enabled",
        value: "true",
        category: "AUDIT",
        description: "Activar registro de auditoría"
    },

    {
        key: "audit.trackLocationChanges",
        value: "true",
        category: "AUDIT",
        description: "Registrar cambios de ubicación"
    },

    {
        key: "audit.trackAssignments",
        value: "true",
        category: "AUDIT",
        description: "Registrar asignaciones y cambios de usuario"
    }

];


// =====================================================
// MAIN
// =====================================================

async function main() {

    console.log("========================================");
    console.log("Starting configuration seed...");
    console.log("========================================");


    let created = 0;
    let updated = 0;


    for (const configuration of configurations) {

        const existing =
            await prisma.configuration.findUnique({
                where: {
                    key: configuration.key
                }
            });


        if (existing) {

            await prisma.configuration.update({
                where: {
                    key: configuration.key
                },

                data: {
                    value: configuration.value,
                    category: configuration.category,
                    description: configuration.description
                }
            });

            updated++;

        } else {

            await prisma.configuration.create({
                data: configuration
            });

            created++;

        }

    }


    console.log("");
    console.log("========================================");
    console.log("CONFIGURATION SEED COMPLETED");
    console.log("========================================");

    console.log(
        `Configurations created: ${created}`
    );

    console.log(
        `Configurations updated: ${updated}`
    );

    console.log(
        `Total configurations: ${configurations.length}`
    );

    console.log("========================================");
}


// =====================================================
// EXECUTION
// =====================================================

main()

    .catch((error) => {

        console.error("");
        console.error("========================================");
        console.error("CONFIGURATION SEED FAILED");
        console.error("========================================");

        console.error(error);

        process.exit(1);

    })

    .finally(async () => {

        await prisma.$disconnect();

    });