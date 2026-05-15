import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  imports: [AuthModule],
  controllers: [LlmController],
  providers: [LlmService],
})
export class LlmModule {}
