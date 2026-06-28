import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AllowAnonymous: () => () => {},
  Session: () => () => {},
}));

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
