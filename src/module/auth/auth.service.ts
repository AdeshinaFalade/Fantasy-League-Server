import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthNestService } from '@thallesp/nestjs-better-auth';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
    constructor(private readonly auth: BetterAuthNestService) { }

    register(dto: RegisterAuthDto) {
        return this.auth.instance.api.signUpEmail({
            body: {
                name: dto.name,
                email: dto.email,
                password: dto.password,
            },
        });
    }

    login(dto: LoginAuthDto) {
        return this.auth.instance.api.signInEmail({
            body: {
                email: dto.email,
                password: dto.password,
            },
        });
    }

    logout(headers: Record<string, string | string[] | undefined>) {
        return this.auth.instance.api.signOut({
            headers: this.toHeaders(headers),
        });
    }

    private toHeaders(headers: Record<string, string | string[] | undefined>) {
        const output = new Headers();

        for (const [key, value] of Object.entries(headers)) {
            if (Array.isArray(value)) {
                output.set(key, value.join(', '));
                continue;
            }

            if (value) {
                output.set(key, value);
            }
        }

        return output;
    }
}
