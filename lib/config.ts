// lib/config.ts - Environment configuration and validation

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
    'POSTGRES_PASSWORD',
    'HUNTER_ADMIN_USER',
    'HUNTER_ADMIN_PASSWORD',
    'GOOGLE_CALENDAR_ID',
    'RESEND_API_KEY',
] as const;

/**
 * Optional environment variables with their default values
 */
const OPTIONAL_ENV_VARS = {
    POSTGRES_HOST: 'postgres',
    POSTGRES_PORT: '5432',
    POSTGRES_DB: 'agents_platform',
    POSTGRES_USER: 'hunter_admin',
    NODE_ENV: 'development',
} as const;

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variables are missing
 */
export function validateConfig(): void {
    const missing: string[] = [];

    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ CONFIGURATION ERROR: Missing Required Environment Variables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following required environment variables are not set:
${missing.map(v => `  • ${v}`).join('\n')}

Please ensure these variables are defined in your environment
or in your .env file before starting the application.

For production deployments, set these in your hosting platform's
environment configuration.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();

        throw new Error(errorMessage);
    }
}

/**
 * Get an environment variable with type safety
 * Returns the value or throws if required and not set
 */
export function getEnvVar(name: string, required: boolean = false): string | undefined {
    const value = process.env[name];

    if (required && !value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }

    return value;
}

/**
 * Get an environment variable with a default value
 */
export function getEnvVarWithDefault(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
}

/**
 * Validate configuration on module import (server-side only)
 * This runs when the module is first imported
 */
if (typeof window === 'undefined') {
    // Only validate on server-side
    try {
        validateConfig();
        console.log('✅ Environment configuration validated successfully');
    } catch (error) {
        console.error(error);
        // In production, we want to fail fast
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

/**
 * Export configuration values for easy access
 */
export const config = {
    // Database
    database: {
        host: getEnvVarWithDefault('POSTGRES_HOST', OPTIONAL_ENV_VARS.POSTGRES_HOST),
        port: parseInt(getEnvVarWithDefault('POSTGRES_PORT', OPTIONAL_ENV_VARS.POSTGRES_PORT)),
        database: getEnvVarWithDefault('POSTGRES_DB', OPTIONAL_ENV_VARS.POSTGRES_DB),
        user: getEnvVarWithDefault('POSTGRES_USER', OPTIONAL_ENV_VARS.POSTGRES_USER),
        password: getEnvVar('POSTGRES_PASSWORD', true)!,
        ssl: false,
    },

    // Admin Authentication (shared across all sites: dog walking admin and Hunter memorial)
    admin: {
        user: getEnvVar('HUNTER_ADMIN_USER', true)!,
        password: getEnvVar('HUNTER_ADMIN_PASSWORD', true)!,
        user2: getEnvVar('HUNTER_ADMIN_USER_2'),
        password2: getEnvVar('HUNTER_ADMIN_PASSWORD_2'),
    },

    // External Services
    googleCalendarId: getEnvVar('GOOGLE_CALENDAR_ID', true)!,
    resendApiKey: getEnvVar('RESEND_API_KEY', true)!,
    notionApiKey: getEnvVar('NOTION_API_KEY'),
    telegramBotToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
    telegramChatId: getEnvVar('TELEGRAM_CHAT_ID'),

    // Application
    nodeEnv: getEnvVarWithDefault('NODE_ENV', OPTIONAL_ENV_VARS.NODE_ENV),
    isProduction: getEnvVarWithDefault('NODE_ENV', OPTIONAL_ENV_VARS.NODE_ENV) === 'production',
    isDevelopment: getEnvVarWithDefault('NODE_ENV', OPTIONAL_ENV_VARS.NODE_ENV) === 'development',
} as const;
