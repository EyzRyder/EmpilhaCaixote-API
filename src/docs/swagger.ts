import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

export const swaggerOptions =(PORT:string): swaggerJsdoc.Options=>{
    return {
        definition: {
          openapi: "3.1.0",
          info: {
            title: "Empilha Caixote API",
            version: "1.0.0",
            description: "API documentation for the game backend",
          },
          servers: [
            {
              url: `http://localhost:${PORT}`,
              description: "Local server",
            },
          ],
        },
      
        // All route/controller documentation files
        apis: [
          path.join(__dirname, "../modules/**/*.ts"), // auto load all docs from modules
        ],
      }
};

export const swaggerSpec =(PORT:string)=> swaggerJsdoc(swaggerOptions(PORT));
