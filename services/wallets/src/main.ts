import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("Wallets API")
    .setDescription("Wallet Service API - Jungle Gaming")
    .setVersion("1.0")
    .addServer("http://localhost:8000/wallets", "Local via Kong")
    .addServer("http://localhost:4002", "Local direct")
    .addTag("wallets", "Wallet operations")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
  
  const port = process.env.PORT;
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
}

bootstrap();
