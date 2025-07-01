const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'diva_security';

let db;

async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(mongoUrl);
    db = client.db(dbName);
    console.log('Connected to MongoDB successfully');
    
    // Create indexes for better performance
    await db.collection('scans').createIndex({ "documentNumber": 1 });
    await db.collection('scans').createIndex({ "timestamp": -1 });
    await db.collection('scans').createIndex({ "documentType": 1 });
    await db.collection('scans').createIndex({ "fullName": 1 });
    
    console.log('Database indexes created');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db ? 'Connected' : 'Disconnected'
  });
});

// Save scan data
app.post('/api/scans', async (req, res) => {
  try {
    const scanData = req.body;
    
    // Validate required fields
    if (!scanData.documentNumber || !scanData.documentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: documentNumber and documentType'
      });
    }
    
    // Add metadata
    const enrichedData = {
      ...scanData,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date()
    };
    
    const result = await db.collection('scans').insertOne(enrichedData);
    
    res.json({
      success: true,
      id: result.insertedId,
      message: 'Scan data saved successfully'
    });
    
    console.log(`New scan saved: ${scanData.documentType} - ${scanData.documentNumber}`);
    
  } catch (error) {
    console.error('Error saving scan data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all scans with pagination
app.get('/api/scans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const collection = db.collection('scans');
    
    // Get total count
    const totalCount = await collection.countDocuments();
    
    // Get scans with pagination
    const scans = await collection
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    res.json({
      success: true,
      data: scans,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching scans:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get scan by ID
app.get('/api/scans/:id', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(mongoUrl);
    
    await client.connect();
    const db = client.db(dbName);
    
    const scan = await db.collection('scans').findOne({
      _id: new require('mongodb').ObjectId(req.params.id)
    });
    
    await client.close();
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }
    
    res.json({
      success: true,
      data: scan
    });
    
  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search scans
app.get('/api/scans/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const collection = db.collection('scans');
    
    // Create search filter
    const filter = {
      $or: [
        { documentNumber: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } },
        { state: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Get total count
    const totalCount = await collection.countDocuments(filter);
    
    // Get matching scans
    const scans = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    res.json({
      success: true,
      data: scans,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error searching scans:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const collection = db.collection('scans');
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          dlCount: {
            $sum: { $cond: [{ $eq: ['$documentType', 'Driving License'] }, 1, 0] }
          },
          idCount: {
            $sum: { $cond: [{ $eq: ['$documentType', 'Identification Card'] }, 1, 0] }
          }
        }
      }
    ]).toArray();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScans = await collection.countDocuments({
      timestamp: { $gte: today }
    });
    
    const result = stats[0] || { totalScans: 0, dlCount: 0, idCount: 0 };
    result.todayScans = todayScans;
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete scan (admin only)
app.delete('/api/scans/:id', async (req, res) => {
  try {
    // In a real application, add authentication here
    const result = await db.collection('scans').deleteOne({
      _id: new require('mongodb').ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scan deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting scan:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Serve index.html for any non-API route
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
  await connectToDatabase();
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Diva Security Backend Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🔗 API Base URL: http://localhost:${port}/api`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
}); 