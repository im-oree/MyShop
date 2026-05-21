#!/bin/bash
# Setup script for E-Commerce Platform

echo "🚀 Setting up E-Commerce Platform..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# Setup Backend
echo ""
echo "📦 Setting up backend..."
cd backend
cp .env.example .env
echo "→ Created .env file. Please update with your credentials."
npm install
echo "✓ Backend dependencies installed"

# Setup Frontend
echo ""
echo "📦 Setting up frontend..."
cd ../frontend
cp .env.example .env.local
echo "→ Created .env.local file. Please update with your API URL."
npm install
echo "✓ Frontend dependencies installed"

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update backend/.env with Firebase and Paystack credentials"
echo "2. Update frontend/.env.local with your backend API URL"
echo "3. Run 'npm run dev' in backend directory to start server"
echo "4. Run 'npm run dev' in frontend directory to start app"
echo ""
echo "📖 See DEPLOYMENT.md for detailed setup instructions"
