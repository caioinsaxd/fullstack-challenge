import { Module, Global } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtService } from "./jwt.service";

@Global()
@Module({
  providers: [JwtService, JwtAuthGuard],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
