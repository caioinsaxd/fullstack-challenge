import { Global, Module } from "@nestjs/common";
import { RabbitMQPublisher } from "./rabbitmq.publisher";

@Global()
@Module({
  providers: [RabbitMQPublisher],
  exports: [RabbitMQPublisher],
})
export class MessagingModule {}