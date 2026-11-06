import Tour from '../models/Tour.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/escape.js';

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

// Light projection for listing pages.
const CARD_FIELDS =
  'slug title destination category durationDays summary heroImage isFeatured sortOrder updatedAt';

/* ---------- public ---------- */

export const listTours = async (req, res) => {
  const { q, category, destination, featured, page, limit } = req.valid.query;

  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (destination) filter.destination = new RegExp(`^${escapeRegex(destination)}$`, 'i');
  if (featured) filter.isFeatured = featured === 'true';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { destination: rx }, { summary: rx }];
  }

  const [tours, total] = await Promise.all([
    Tour.find(filter)
      .select(CARD_FIELDS)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tour.countDocuments(filter),
  ]);

  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.json({
    success: true,
    tours,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

// Every published slug + last modified date. Feeds sitemap.xml and generateStaticParams.
export const listSlugs = async (_req, res) => {
  const tours = await Tour.find({ isPublished: true }).select('slug updatedAt').lean();
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.json({ success: true, tours });
};

export const getTour = async (req, res) => {
  const tour = await Tour.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!tour) throw new AppError(404, 'Tour not found');
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.json({ success: true, tour });
};

/* ---------- admin (tours:write) ---------- */

export const listAllTours = async (_req, res) => {
  const tours = await Tour.find().select(`${CARD_FIELDS} isPublished`).sort({ sortOrder: 1 }).lean();
  res.json({ success: true, tours });
};

export const getTourById = async (req, res) => {
  const tour = await Tour.findById(req.params.id).lean();
  if (!tour) throw new AppError(404, 'Tour not found');
  res.json({ success: true, tour });
};

export const createTour = async (req, res) => {
  const data = { ...req.body, slug: req.body.slug || slugify(req.body.title) };
  if (!data.slug) throw new AppError(400, 'Could not build a slug from the title');
  if (await Tour.exists({ slug: data.slug })) throw new AppError(409, 'That slug is already in use');

  const tour = await Tour.create(data);
  res.status(201).json({ success: true, tour });
};

export const updateTour = async (req, res) => {
  if (req.body.slug && (await Tour.exists({ slug: req.body.slug, _id: { $ne: req.params.id } }))) {
    throw new AppError(409, 'That slug is already in use');
  }
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!tour) throw new AppError(404, 'Tour not found');
  res.json({ success: true, tour });
};

export const deleteTour = async (req, res) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) throw new AppError(404, 'Tour not found');
  res.json({ success: true });
};
