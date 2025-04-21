# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Environment Variables

This application uses environment variables for configuration. Follow these steps to set them up:

1. Create a `.env` file in the root of the client directory with the following variables:

   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```
2. For Docker environments, you can use the same `.env` file by mounting it to the container:

   ```bash
   # Development
   docker run -p 3000:80 --env-file .env your-image-name
   ```

   In docker-compose:

   ```yaml
   services:
     client:
       build: ./client
       ports:
         - "3000:80"
       env_file:
         - ./client/.env
   ```
3. For production deployments, you can either:

   - Use an `.env.production` file in your build process
   - Set environment variables in your CI/CD pipeline or cloud provider's dashboard

Note: Environment variables in Vite must be prefixed with `VITE_` to be accessible in the client-side code.
