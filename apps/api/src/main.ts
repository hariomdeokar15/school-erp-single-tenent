import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { CorrelationIdInterceptor } from "./common/interceptors/correlation-id.interceptor";
import { API_PREFIX } from "./common/constants";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === "production"
        ? ["error", "warn", "log"]
        : ["log", "debug", "error", "warn", "verbose"],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port", 3000);
  const environment = configService.get<string>("environment", "development");
  const corsOrigins = configService.get<string[]>("cors.origins", [
    "http://localhost:3001",
  ]);

  // Security Headers via Helmet
  app.use(helmet());

  // Restrictive CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix(API_PREFIX);

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI/Swagger Documentation (enabled only in non-production environments)
  if (environment !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("SchoolERP India API")
      .setDescription(
        "Production API contracts for single Indian K-12 school operating system",
      )
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
    logger.log(`Swagger documentation enabled at /${API_PREFIX}/docs`);
  }

  await app.listen(port);
  logger.log(
    `SchoolERP API listening on port ${port} in [${environment}] mode`,
  );
}

bootstrap();
