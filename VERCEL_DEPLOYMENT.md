# Vercel Deployment Guide

## Quick Setup (Recommended)

Since your project is already on GitHub at `https://github.com/ExaltedMags/csci112-group1-final-project-RHC`, the easiest way to deploy is:

1. **Go to [vercel.com/new](https://vercel.com/new)**
2. **Import your GitHub repository**: `ExaltedMags/csci112-group1-final-project-RHC`
3. **Configure the project**:
   - Project Name: `csci112-group1-final-project-rhc` (or your preferred name)
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Add Environment Variables** (in Vercel Dashboard → Settings → Environment Variables):
   
   **Required:**
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_DB` - Your database name
   
   **Optional (but recommended):**
   - `MAPBOX_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` - For map features
   - `ORS_API_KEY` - For OpenRouteService routing
   - `NEXT_PUBLIC_ALLOW_DEMO_USER` - Set to `"true"` for demo login

5. **Deploy** - Click "Deploy" and Vercel will build and deploy your app

## After Initial Setup

Once the project is created, you can use Vercel MCP tools to:
- View deployments
- Check deployment logs
- Update environment variables
- Monitor project status

## Important Notes

- **MongoDB Access**: Ensure your MongoDB connection string allows connections from Vercel's IP addresses (0.0.0.0/0 for MongoDB Atlas)
- **Environment Variables**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- **Automatic Deployments**: After connecting to GitHub, every push to your main branch will trigger a new deployment

