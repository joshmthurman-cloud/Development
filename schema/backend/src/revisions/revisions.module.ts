import { Module } from '@nestjs/common';
import { RevisionsService } from './revisions.service';
import { RevisionsController } from './revisions.controller';

@Module({
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
