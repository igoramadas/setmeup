// SetMeUp: infisical.ts

import {InfisicalOptions} from "./types"
import {parseEnvValue} from "./utils"

/** Infisical secret as returned by the API. */
export interface InfisicalSecret {
    secretKey: string
    secretValue: string
}

/** Resolved Infisical connection settings. */
export interface InfisicalConnection {
    clientId: string
    clientSecret: string
    projectId: string
    environment: string
    secretPath: string
    siteUrl: string
}

/** Timeout for each request to the Infisical API, in milliseconds. */
const requestTimeout = 10000

/**
 * Resolve the Infisical connection from the passed options, falling back to the SMU_INFISICAL_* environment variables.
 * @param options Infisical options.
 * @returns Connection settings, or null if no client ID was set.
 */
export function getInfisicalConnection(options?: InfisicalOptions): InfisicalConnection {
    const env = process.env
    const clientId = options?.clientId || env.SMU_INFISICAL_CLIENT_ID
    if (!clientId) return null

    const connection = {
        clientId: clientId,
        clientSecret: options?.clientSecret || env.SMU_INFISICAL_CLIENT_SECRET,
        projectId: options?.projectId || env.SMU_INFISICAL_PROJECT_ID,
        environment: options?.environment || env.SMU_INFISICAL_ENVIRONMENT || "prod",
        secretPath: options?.secretPath || env.SMU_INFISICAL_SECRET_PATH || "/",
        siteUrl: options?.siteUrl || env.SMU_INFISICAL_SITE_URL || "https://app.infisical.com"
    }
    if (!connection.clientSecret || !connection.projectId) {
        throw new Error("Infisical clientSecret and projectId are required when the clientId is set")
    }

    return connection
}

/**
 * Call the Infisical API using a fresh Universal Auth access token.
 * @param connection Infisical connection settings.
 * @param method HTTP method.
 * @param urlPath API path, including the query string.
 * @param body Optional JSON body.
 * @returns The parsed JSON response.
 */
export async function infisicalRequest(connection: InfisicalConnection, method: string, urlPath: string, body?: any): Promise<any> {
    const login = await fetch(new URL("/api/v1/auth/universal-auth/login", connection.siteUrl), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({clientId: connection.clientId, clientSecret: connection.clientSecret}),
        signal: AbortSignal.timeout(requestTimeout)
    })
    if (!login.ok) {
        throw new Error(`Infisical login failed: ${login.status} ${await login.text()}`)
    }
    const {accessToken} = await login.json()

    const response = await fetch(new URL(urlPath, connection.siteUrl), {
        method: method,
        headers: {Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json"},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(requestTimeout)
    })
    if (!response.ok) {
        throw new Error(`Infisical ${method} ${new URL(urlPath, connection.siteUrl).pathname} failed: ${response.status} ${await response.text()}`)
    }

    return response.json()
}

/**
 * Parse an Infisical secret value like an environment variable, but also parsing JSON arrays.
 * @param value The secret value.
 */
export const parseInfisicalValue = (value: string): any => {
    if (value.startsWith("[") && value.endsWith("]")) {
        try {
            return JSON.parse(value)
        } catch (ex) {
            // Not a JSON array, so handle it as a regular value.
        }
    }

    return parseEnvValue(value)
}
