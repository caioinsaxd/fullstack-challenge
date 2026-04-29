import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserData {
  playerId: string;
  username?: string;
  roles?: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user || {};
    
    const playerId = user.sub || user.playerId || request.playerId;
    
    if (!playerId) {
      return undefined;
    }
    
    const userData: CurrentUserData = {
      playerId,
      username: user.username || user.email,
      roles: user.roles || [],
    };
    
    if (data) {
      return userData[data];
    }
    
    return userData;
  }
);
