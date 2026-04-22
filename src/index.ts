import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { WeekDay } from "./generated/prisma/enums.js";
import { auth } from "./lib/auth.js";

const app = Fastify({
  logger: true
});

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(fastifySwagger, { 
  openapi: {
    info: {
      title: "Api Treinos",
      description: "Api para gerenciamento de treinos",
      version: "1.0.0"
    },
    servers: [{
      description: "Servidor local",
      url: "http://localhost:8081"
    }
    ]
  },
  transform: jsonSchemaTransform
})


await app.register(fastifyCors,{
  origin: true,
  credentials: true,
})

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Coach API", 
        slug: "coach-api",
        url: "/swagger.json"
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema"
      }
    ]
  }
})

app.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/workout-plans",
  schema:{
    body: z.object({
        name: z.string().trim().min(1),
        workoutDays:z.array(
        z.object({
        name: z.string().trim().min(1),
        WeekDay: z.enum(WeekDay),
        isRest: z.boolean().default(false),
        estimatedDurationInSeconds: z.number().min(1),
        exercises: z.array(z.object({
          order: z.number().min(0),
          name: z.string().trim().min(1),
          sets: z.number().min(1),
          reps: z.number().min(1),
          restTimeInSeconds: z.number().min(1)
      })
    )
    })
  )
  }),
    response: {
      201: z.object({
        id: z.uuid(),
        name: z.string().trim().min(1),
        workoutDays:z.array(
        z.object({
        name: z.string().trim().min(1),
        WeekDay: z.enum(WeekDay),
        isRest: z.boolean().default(false),
        estimatedDurationInSeconds: z.number().min(1),
        exercises: z.array(z.object({
          order: z.number().min(0),
          name: z.string().trim().min(1),
          sets: z.number().min(1),
          reps: z.number().min(1),
          restTimeInSeconds: z.number().min(1)
      })
    )
    })
  )
  }),
      400: z.object({
        error: z.string(),
        code: z.string()
      })
},
  },
  handler: async (request, reply) => {}
})



app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema:{
   hide: true
  },
  handler: async () => {
    return app.swagger();
}
})

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema:{
    description: "Hello world endpoint",
    tags: ["Hello"],
    response:{
      200: z.object({
        message: z.string()
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello world"
    }
}
})

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);
      
      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({ 
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
});

try {
  await app.listen({ port: Number(process.env.PORT ) || 8081})
} catch (err) {
  app.log.error(err)
  process.exit(1)
}