import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RestaurantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.restaurantId;
  },
);
