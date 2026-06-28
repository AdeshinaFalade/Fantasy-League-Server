import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @AllowAnonymous()
  @Get('health')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }
}
