import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });
  
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("Crash Game API")
    .setDescription("Multiplayer Crash Game API - Jungle Gaming")
    .setVersion("1.0")
    .addServer("http://localhost:8000/games", "Local via Kong")
    .addServer("http://localhost:4001", "Local direct")
    .addTag("games", "Game round operations")
    .addTag("bets", "Bet operations")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
  
  const port = process.env.PORT;
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
}

bootstrap();
