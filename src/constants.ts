export const BE_URL = import.meta.env.VITE_BE_URL || process.env.VITE_BE_URL || 'http://localhost:5000'

export const DEFAULT_CONVERSION_PARAMS = [
        { "paramName": "f", "paramValue": "svg" },
        { "paramName": "LA", "paramValue": "" },
        { "paramName": "HLALL", "paramValue": "" },
        { "paramName": "model", "paramValue": "" },
        { "paramName": "RL", "paramValue": "RM_" },
        { "paramName": "TL", "paramValue": "RM_TXT" }
        // { "paramName": "compare", "paramValue": "74d223c5-a031-4369-808a-a6e92401ec4c" },
    ]