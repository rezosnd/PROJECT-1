import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// Configure Cloudinary from environment
const cloudName = config.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dum1lkao3';
const apiKey = config.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '817787181634525';
const apiSecret = config.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '8B-tgtrVOlogYCgoSeEOilGeW4k';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

export const cloudinaryService = {
  /**
   * Upload hospital photo or facility image to Cloudinary
   */
  async uploadHospitalPhoto({ hospitalId, image, folder = 'lifelink/hospitals' }) {
    try {
      logger.info({ hospitalId, folder }, '[Cloudinary] Uploading hospital asset...');

      const uploadOptions = {
        folder,
        public_id: `hospital_${hospitalId || Date.now()}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      };

      const res = await cloudinary.uploader.upload(image, uploadOptions);
      logger.info({ publicId: res.public_id, url: res.secure_url }, '[Cloudinary] Asset uploaded successfully');

      return {
        success: true,
        url: res.secure_url,
        publicId: res.public_id,
        format: res.format,
        width: res.width,
        height: res.height
      };
    } catch (err) {
      logger.error({ err: err.message, hospitalId }, '[Cloudinary] Upload failed');
      throw new Error(`Cloudinary asset upload failed: ${err.message}`);
    }
  },

  /**
   * Upload hospital verification documents or accreditation certificates
   */
  async uploadHospitalDocument({ hospitalId, documentData, filename, folder = 'lifelink/documents' }) {
    try {
      const uploadOptions = {
        folder,
        public_id: `doc_${hospitalId}_${filename || Date.now()}`,
        resource_type: 'auto'
      };

      const res = await cloudinary.uploader.upload(documentData, uploadOptions);
      return {
        success: true,
        url: res.secure_url,
        publicId: res.public_id
      };
    } catch (err) {
      logger.error({ err: err.message }, '[Cloudinary] Document upload failed');
      throw new Error(`Document upload failed: ${err.message}`);
    }
  }
};

