import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { VarParser } from '../services/varParser.js';
import { FieldMapper } from '../services/fieldMapper.js';
import { PdfExtractor } from '../services/pdfExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `test-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Test PDF extraction endpoint (no auth required for testing)
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Testing PDF extraction for: ${fileName}`);

    // Step 1: Extract text from PDF
    const pdfText = await PdfExtractor.extractText(filePath);
    console.log(`Extracted ${pdfText.length} characters from PDF`);

    // Step 2: Identify format
    const format = PdfExtractor.identifyFormat(pdfText);
    console.log(`Identified format: ${format}`);

    // Step 3: Parse VAR data
    const varData = await VarParser.parseFromPdf(filePath);
    console.log('Parsed VAR data:', JSON.stringify(varData, null, 2));

    // Step 4: Map to STEAM fields
    const varType = varData.format || format || 'TSYS';
    const steamFields = FieldMapper.mapToSteam(varData, {}, varType);
    console.log('Mapped STEAM fields:', JSON.stringify(steamFields, null, 2));

    // Step 5: Validate (pass varType so validation is type-aware)
    const validation = FieldMapper.validate(steamFields, varType);

    res.json({
      success: true,
      fileName,
      format,
      extractedTextLength: pdfText.length,
      extractedTextPreview: pdfText.substring(0, 500) + '...',
      varData,
      steamFields,
      validation,
      message: 'PDF extraction and parsing completed successfully!'
    });
  } catch (error) {
    console.error('PDF extraction test error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process PDF',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;


