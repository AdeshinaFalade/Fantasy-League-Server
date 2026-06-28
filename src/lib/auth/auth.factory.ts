import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { PrismaService } from '../database/prisma.service';

function getTrustedOrigins(): string[] {
    const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    return configuredOrigins?.length
        ? configuredOrigins
        : [
            process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:3001',
        ];
}

export function createBetterAuth(prismaService: PrismaService) {
    return betterAuth({
        database: prismaAdapter(prismaService as never, {
            provider: 'postgresql',
            transaction: true,
        }),
        emailAndPassword: {
            enabled: true,
        },
        trustedOrigins: getTrustedOrigins(),
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        plugins: [
            bearer()
        ],
    });
}
