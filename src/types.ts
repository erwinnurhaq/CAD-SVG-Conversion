export interface FileRecord {
    id: number
    fileId: string
    filename: string
    url: string
    createdAt: string
}

export type ConversionStatus = 'pending' | 'success' | 'failed'

export interface ConversionFileRecord {
    id?: number
    conversionId: string
    conversionUrl: string | null
    conversionType: string
    fileId: string
    compareFileId: string | null
    status: ConversionStatus
    error: string | null
    createdAt: string
}

export type ConversionLayers = {
    Name: string;
    Off: boolean;
    Frozen: boolean;
    Hidden: boolean;
    Plottable: boolean
}