import { Module } from '@nestjs/common';
import { OfficeInHomeService } from './office-in-home.service';
import { OfficeInHomeController } from './office-in-home.controller';

@Module({
  controllers: [OfficeInHomeController],
  providers: [OfficeInHomeService],
  exports: [OfficeInHomeService],
})
export class OfficeInHomeModule {}
