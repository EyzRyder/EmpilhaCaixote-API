import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

export const swaggerOptions =(PORT:string): swaggerJsdoc.Options=>{
  return {
    definition: {
      openapi: "3.1.0",
      info: {
        title: "Empilha Caixote API",
        version: "1.0.0",
        description: "API documentation for the game EMPILHA CAXOTE backend",
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: "Local server",
        },
      ],

      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            in:"header",
            name:"Authorization",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },

    apis: [path.join(__dirname, "../modules/**/*.ts")],
  };
};

export const swaggerSpec =(PORT:string)=> swaggerJsdoc(swaggerOptions(PORT));
