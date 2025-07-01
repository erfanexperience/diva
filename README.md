# Diva Security - ID Scanner System

A professional browser-based application for scanning and processing ID/DL data from barcode scanners. The application provides a secure login system, real-time data parsing, and comprehensive display of personal and document information.

## Features

- 🔐 **Secure Login System** - Username/password authentication
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🔍 **Real-time Scanning** - Automatic data capture from USB barcode scanners
- 📊 **Comprehensive Data Display** - Organized sections for all ID/DL information
- 💾 **Data Persistence** - Save scanned data to database
- 🖨️ **Print Reports** - Generate printable reports
- 📤 **Export Data** - Export data in JSON format
- 🎨 **Modern UI** - Beautiful animations and professional styling

## Login Credentials

- **Username:** Hamid
- **Password:** mayaeva3911

## Supported Document Types

- **California Driver's License (DL)**
- **California Identification Card (ID)**

## Data Fields Extracted

### Personal Information
- Full Name
- Date of Birth
- Age (calculated)
- Gender
- Eye Color
- Hair Color
- Height
- Weight

### Document Information
- Document Number
- Issue Date
- Expiration Date
- Document Class
- Restrictions
- Endorsements

### Address Information
- Street Address
- City
- State
- ZIP Code
- Country

### Additional Information
- Organ Donor Status
- Veteran Status
- Race/Ethnicity
- Place of Birth

## Setup Instructions

### 1. Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/diva-security.git
   cd diva-security
   ```

2. **Open the application:**
   - Simply open `index.html` in a web browser
   - Or use a local server for better development experience

3. **Using a local server (recommended):**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Access the application:**
   - Navigate to `http://localhost:8000` in your browser

### 2. Barcode Scanner Setup

1. **Connect your USB barcode scanner**
2. **Configure scanner settings:**
   - Set scanner to "USB HID Keyboard" mode
   - Ensure scanner adds a carriage return after each scan
   - Test scanner with any text editor

3. **Using the application:**
   - Login with provided credentials
   - The scanner input field will automatically receive focus
   - Scan any California ID or DL
   - Data will be automatically parsed and displayed

## Database Setup Recommendations

### Recommended Database: **MongoDB**

MongoDB is the best choice for this application because:

1. **Flexible Schema** - ID data can vary between states and document types
2. **JSON-like Documents** - Natural fit for the parsed ID data
3. **Scalability** - Easy to scale as you add more features
4. **Real-time Capabilities** - Great for live data processing
5. **Cloud Options** - MongoDB Atlas provides easy cloud hosting

### Alternative Options:

1. **PostgreSQL** - Good for structured data with JSON support
2. **Firebase Firestore** - Excellent for real-time applications
3. **Supabase** - PostgreSQL with real-time features

### MongoDB Setup Instructions:

1. **Install MongoDB:**
   ```bash
   # On Windows
   # Download from https://www.mongodb.com/try/download/community
   
   # On macOS
   brew install mongodb-community
   
   # On Ubuntu
   sudo apt-get install mongodb
   ```

2. **Start MongoDB:**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongod
   
   # Enable auto-start
   sudo systemctl enable mongod
   ```

3. **Create Database and Collection:**
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Create database
   use diva_security
   
   # Create collection
   db.createCollection('scans')
   
   # Create indexes for better performance
   db.scans.createIndex({ "documentNumber": 1 })
   db.scans.createIndex({ "timestamp": -1 })
   db.scans.createIndex({ "documentType": 1 })
   ```

4. **Backend API Setup (Node.js/Express):**

   Create a `server.js` file:
   ```javascript
   const express = require('express');
   const { MongoClient } = require('mongodb');
   const cors = require('cors');
   
   const app = express();
   const port = 3000;
   
   app.use(cors());
   app.use(express.json());
   
   const mongoUrl = 'mongodb://localhost:27017';
   const dbName = 'diva_security';
   
   app.post('/api/scans', async (req, res) => {
     try {
       const client = await MongoClient.connect(mongoUrl);
       const db = client.db(dbName);
       const collection = db.collection('scans');
       
       const scanData = {
         ...req.body,
         timestamp: new Date(),
         ipAddress: req.ip
       };
       
       const result = await collection.insertOne(scanData);
       
       await client.close();
       
       res.json({ 
         success: true, 
         id: result.insertedId 
       });
     } catch (error) {
       res.status(500).json({ 
         success: false, 
         error: error.message 
       });
     }
   });
   
   app.get('/api/scans', async (req, res) => {
     try {
       const client = await MongoClient.connect(mongoUrl);
       const db = client.db(dbName);
       const collection = db.collection('scans');
       
       const scans = await collection
         .find({})
         .sort({ timestamp: -1 })
         .limit(100)
         .toArray();
       
       await client.close();
       
       res.json({ success: true, data: scans });
     } catch (error) {
       res.status(500).json({ 
         success: false, 
         error: error.message 
       });
     }
   });
   
   app.listen(port, () => {
     console.log(`Server running on port ${port}`);
   });
   ```

5. **Install Dependencies:**
   ```bash
   npm init -y
   npm install express mongodb cors
   ```

6. **Update Frontend:**
   Modify the `saveToDatabase()` function in `script.js` to call your API:
   ```javascript
   async function saveToDatabase() {
     if (!currentScanData) {
       showMessage('No data to save. Please scan an ID first.', 'error');
       return;
     }
     
     showLoading(true);
     
     try {
       const response = await fetch('http://localhost:3000/api/scans', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(currentScanData)
       });
       
       const result = await response.json();
       
       if (result.success) {
         showMessage('Data saved successfully!', 'success');
       } else {
         throw new Error(result.error);
       }
     } catch (error) {
       showMessage('Error saving data: ' + error.message, 'error');
     } finally {
       showLoading(false);
     }
   }
   ```

## Deployment Options

### 1. GitHub Pages (Free)
1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select source branch (usually `main`)
4. Your app will be available at `https://yourusername.github.io/repository-name`

### 2. Netlify (Free)
1. Connect your GitHub repository to Netlify
2. Deploy automatically on every push
3. Get a custom domain option

### 3. Vercel (Free)
1. Connect your GitHub repository to Vercel
2. Automatic deployments
3. Great performance and analytics

### 4. AWS S3 + CloudFront
1. Upload files to S3 bucket
2. Configure CloudFront for CDN
3. Use Route 53 for custom domain

## Security Considerations

1. **HTTPS Only** - Always use HTTPS in production
2. **Input Validation** - Validate all scanned data
3. **Rate Limiting** - Implement API rate limiting
4. **Data Encryption** - Encrypt sensitive data at rest
5. **Access Logs** - Log all access attempts
6. **Regular Updates** - Keep dependencies updated

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

## Changelog

### v1.0.0
- Initial release
- Login system
- ID/DL parsing
- Responsive design
- Data export functionality 