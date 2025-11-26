# Vercel Deployment Instructions

## Step 1: Create Project on Vercel (One-time setup)

Since Vercel MCP tools work with existing projects, you need to create the project first:

1. **Go to**: https://vercel.com/new
2. **Click**: "Continue with GitHub" (or your preferred Git provider)
3. **Authenticate** with your GitHub account if prompted
4. **Select your repository**: `ExaltedMags/csci112-group1-final-project-RHC`
5. **Configure project**:
   - Project Name: `csci112-group1-final-project-rhc`
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

## Step 2: Add Environment Variables

In the Vercel project settings (after creation), go to **Settings → Environment Variables** and add:

### Required:
- `MONGODB_URI` - Your MongoDB connection string
- `MONGODB_DB` - Your database name

### Optional (but recommended):
- `MAPBOX_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` - For map features
- `ORS_API_KEY` - For OpenRouteService routing  
- `NEXT_PUBLIC_ALLOW_DEMO_USER` - Set to `"true"` for demo login

**Important**: 
- Variables with `NEXT_PUBLIC_` prefix are exposed to the browser
- Make sure to add these for **Production**, **Preview**, and **Development** environments

## Step 3: Deploy

Click **"Deploy"** - Vercel will automatically:
- Build your Next.js app
- Deploy it to a URL like: `https://csci112-group1-final-project-rhc.vercel.app`
- Set up automatic deployments on every push to your main branch

## Step 4: Using Vercel MCP Tools (After Project Creation)

Once your project is created, you can use Vercel MCP tools to:

- ✅ View all deployments
- ✅ Check deployment logs
- ✅ Get deployment details
- ✅ Update environment variables
- ✅ Monitor project status
- ✅ View build logs

## Important Notes

1. **MongoDB Access**: Ensure your MongoDB connection string allows connections from Vercel's IP addresses. For MongoDB Atlas, add `0.0.0.0/0` to IP whitelist.

2. **Automatic Deployments**: After connecting to GitHub, every push to your main branch will automatically trigger a new deployment.

3. **Custom Domain**: You can add a custom domain later in **Settings → Domains**.

4. **Project ID**: After creation, note your Project ID (starts with `prj_`) - you'll need it for MCP operations.

