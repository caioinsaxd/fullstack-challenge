import { Global, Module } from "@nestjs/common";
import { RabbitMQSubscriber } from "./rabbitmq.subscriber";

@Global()
@Module({
  providers: [RabbitMQSubscriber],
  exports: [RabbitMQSubscriber],
})
export class MessagingModule {}