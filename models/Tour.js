import mongoose from 'mongoose';
import { TOUR_CATEGORIES } from '../validators/index.js';

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, alt: { type: String, default: '' } },
  { _id: false }
);

const tourSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    legacyId: { type: String, index: true, sparse: true }, // id used by the old React app
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true, index: true },
    category: { type: String, enum: TOUR_CATEGORIES, required: true, index: true },
    durationDays: { type: Number, required: true, min: 1 },
    summary: { type: String, required: true },
    description: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    itinerary: {
      type: [
        new mongoose.Schema(
          { day: Number, title: String, description: { type: String, default: '' } },
          { _id: false }
        ),
      ],
      default: [],
    },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    heroImage: { type: imageSchema },
    gallery: { type: [imageSchema], default: [] },
    faqs: {
      type: [new mongoose.Schema({ question: String, answer: String }, { _id: false })],
      default: [],
    },
    seo: {
      title: String,
      description: String,
      ogImage: String,
    },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

tourSchema.index({ title: 'text', destination: 'text', summary: 'text' });

export default mongoose.model('Tour', tourSchema);
