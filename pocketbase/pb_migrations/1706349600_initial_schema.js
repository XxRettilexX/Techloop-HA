// Initial PocketBase schema migration
// Run automatically on first startup

migrate((db) => {
    // Users collection (extends auth)
    const users = new Collection({
        name: "users",
        type: "auth",
        schema: [
            {
                name: "name",
                type: "text",
                required: true
            },
            {
                name: "avatar",
                type: "file",
                required: false,
                options: {
                    maxSelect: 1,
                    maxSize: 5242880,
                    mimeTypes: ["image/jpeg", "image/png", "image/webp"]
                }
            },
            {
                name: "preferences",
                type: "json",
                required: false
            }
        ]
    });

    // Boiler settings collection
    const boilerSettings = new Collection({
        name: "boiler_settings",
        type: "base",
        schema: [
            {
                name: "user",
                type: "relation",
                required: true,
                options: {
                    collectionId: users.id,
                    cascadeDelete: true
                }
            },
            {
                name: "default_temperature",
                type: "number",
                required: true,
                options: {
                    min: 5,
                    max: 25
                }
            },
            {
                name: "eco_mode_enabled",
                type: "bool",
                required: true
            },
            {
                name: "notifications_enabled",
                type: "bool",
                required: true
            },
            {
                name: "away_mode_temperature",
                type: "number",
                required: true,
                options: {
                    min: 5,
                    max: 20
                }
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_user ON boiler_settings (user)"
        ]
    });

    // Temperature schedules collection
    const schedules = new Collection({
        name: "temperature_schedules",
        type: "base",
        schema: [
            {
                name: "user",
                type: "relation",
                required: true,
                options: {
                    collectionId: users.id,
                    cascadeDelete: true
                }
            },
            {
                name: "name",
                type: "text",
                required: true
            },
            {
                name: "day_of_week",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                }
            },
            {
                name: "time",
                type: "text",
                required: true
            },
            {
                name: "temperature",
                type: "number",
                required: true,
                options: {
                    min: 5,
                    max: 25
                }
            },
            {
                name: "enabled",
                type: "bool",
                required: true
            }
        ],
        indexes: [
            "CREATE INDEX idx_user_day ON temperature_schedules (user, day_of_week)"
        ]
    });

    // Historical data collection (for charts and analytics)
    const history = new Collection({
        name: "boiler_history",
        type: "base",
        schema: [
            {
                name: "timestamp",
                type: "date",
                required: true
            },
            {
                name: "water_temp",
                type: "number",
                required: true
            },
            {
                name: "return_temp",
                type: "number",
                required: false
            },
            {
                name: "pressure",
                type: "number",
                required: true
            },
            {
                name: "modulation",
                type: "number",
                required: true
            },
            {
                name: "flame_on",
                type: "bool",
                required: true
            },
            {
                name: "setpoint",
                type: "number",
                required: true
            },
            {
                name: "indoor_temp",
                type: "number",
                required: false
            },
            {
                name: "outdoor_temp",
                type: "number",
                required: false
            }
        ],
        indexes: [
            "CREATE INDEX idx_timestamp ON boiler_history (timestamp DESC)"
        ]
    });

    // Maintenance logs collection
    const maintenanceLogs = new Collection({
        name: "maintenance_logs",
        type: "base",
        schema: [
            {
                name: "timestamp",
                type: "date",
                required: true
            },
            {
                name: "type",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["anomaly", "maintenance", "warning", "info"]
                }
            },
            {
                name: "severity",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["low", "medium", "high", "critical"]
                }
            },
            {
                name: "message",
                type: "text",
                required: true
            },
            {
                name: "details",
                type: "json",
                required: false
            },
            {
                name: "resolved",
                type: "bool",
                required: true
            }
        ],
        indexes: [
            "CREATE INDEX idx_timestamp_type ON maintenance_logs (timestamp DESC, type)"
        ]
    });

    return Dao(db).saveCollection(users) &&
        Dao(db).saveCollection(boilerSettings) &&
        Dao(db).saveCollection(schedules) &&
        Dao(db).saveCollection(history) &&
        Dao(db).saveCollection(maintenanceLogs);
}, (db) => {
    // Rollback
    const dao = new Dao(db);
    dao.deleteCollection("maintenance_logs");
    dao.deleteCollection("boiler_history");
    dao.deleteCollection("temperature_schedules");
    dao.deleteCollection("boiler_settings");
});
