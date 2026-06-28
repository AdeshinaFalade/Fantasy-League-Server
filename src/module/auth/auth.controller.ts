import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @AllowAnonymous()
    @Post('register')
    @ApiOkResponse()
    register(@Body() dto: RegisterAuthDto) {
        return this.authService.register(dto);
    }

    @AllowAnonymous()
    @Post('login')
    @ApiOkResponse()
    login(@Body() dto: LoginAuthDto) {
        return this.authService.login(dto);
    }

    @Post('logout')
    @ApiBearerAuth()
    @ApiOkResponse()
    logout(@Headers() headers: Record<string, string | string[] | undefined>) {
        return this.authService.logout(headers);
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOkResponse()
    me(@Session() session: unknown) {
        return { session };
    }
}
