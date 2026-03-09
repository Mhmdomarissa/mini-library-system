/**
 * seed-books.ts — Pre-populate the library with 9 books across 3 categories.
 *
 * Each book gets an associated HTML file uploaded to GridFS.
 *
 * Usage:
 *   npx ts-node seeds/seed-books.ts
 *
 * Requires MONGODB_URI in .env (or the environment).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Book } from '../src/models/Book';
import { Readable } from 'stream';

const BUCKET_NAME = 'bookFiles';

interface SeedBook {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  publishedYear: number;
  totalCopies: number;
  htmlFile: string; // filename in seeds/books/
}

const SEED_BOOKS: SeedBook[] = [
  // ── Science Fiction ─────────────────────────────────────────────────
  {
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0-441-17271-9',
    genre: 'Science Fiction',
    description:
      'Set in the distant future, Dune tells the story of Paul Atreides and the struggle for control of the desert planet Arrakis — the only source of the most valuable substance in the universe.',
    publishedYear: 1965,
    totalCopies: 5,
    htmlFile: 'dune.html',
  },
  {
    title: 'Neuromancer',
    author: 'William Gibson',
    isbn: '978-0-441-56956-4',
    genre: 'Science Fiction',
    description:
      'The novel that launched the cyberpunk movement. A washed-up hacker is hired for one last job — the most daring hack in the history of cyberspace.',
    publishedYear: 1984,
    totalCopies: 4,
    htmlFile: 'neuromancer.html',
  },
  {
    title: 'Brave New World',
    author: 'Aldous Huxley',
    isbn: '978-0-06-085052-4',
    genre: 'Science Fiction',
    description:
      'A dystopian vision of a future where humanity is perfected through genetic engineering, conditioning, and the pleasure drug soma — at the cost of freedom and meaning.',
    publishedYear: 1932,
    totalCopies: 6,
    htmlFile: 'brave-new-world.html',
  },

  // ── Classic Literature ──────────────────────────────────────────────
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '978-0-14-143951-8',
    genre: 'Classic Literature',
    description:
      'A sparkling comedy of manners following the turbulent relationship between Elizabeth Bennet and Mr. Darcy in Regency-era England.',
    publishedYear: 1813,
    totalCopies: 5,
    htmlFile: 'pride-and-prejudice.html',
  },
  {
    title: '1984',
    author: 'George Orwell',
    isbn: '978-0-451-52493-5',
    genre: 'Classic Literature',
    description:
      'The defining dystopian novel. Winston Smith struggles against the totalitarian regime of Big Brother in a world where truth itself is controlled by the Party.',
    publishedYear: 1949,
    totalCopies: 7,
    htmlFile: '1984.html',
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    genre: 'Classic Literature',
    description:
      'A shimmering portrait of the Jazz Age. Jay Gatsby throws lavish parties in pursuit of an impossible dream — to recapture a lost love across the bay.',
    publishedYear: 1925,
    totalCopies: 4,
    htmlFile: 'great-gatsby.html',
  },

  // ── Philosophy ──────────────────────────────────────────────────────
  {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    isbn: '978-0-14-044933-4',
    genre: 'Philosophy',
    description:
      'The private journals of the Roman Emperor — a timeless guide to Stoic philosophy, self-discipline, and finding inner peace amidst the chaos of life.',
    publishedYear: 180,
    totalCopies: 5,
    htmlFile: 'meditations.html',
  },
  {
    title: 'The Republic',
    author: 'Plato',
    isbn: '978-0-14-044914-3',
    genre: 'Philosophy',
    description:
      'One of the most influential works in Western thought. Socrates explores the nature of justice, the ideal state, and the Allegory of the Cave.',
    publishedYear: -375,
    totalCopies: 4,
    htmlFile: 'the-republic.html',
  },
  {
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    isbn: '978-0-14-044923-5',
    genre: 'Philosophy',
    description:
      'Nietzsche challenges the foundations of Western morality and calls for free spirits who dare to create their own values beyond inherited dogma.',
    publishedYear: 1886,
    totalCopies: 3,
    htmlFile: 'beyond-good-and-evil.html',
  },
];

async function uploadToGridFS(
  db: mongoose.mongo.Db,
  buffer: Buffer,
  filename: string,
  bookId: string,
): Promise<mongoose.Types.ObjectId> {
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
  const readable = Readable.from(buffer);
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { contentType: 'text/html', bookId },
  });

  return new Promise((resolve, reject) => {
    readable
      .pipe(uploadStream)
      .on('finish', () => resolve(uploadStream.id))
      .on('error', reject);
  });
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database not connected');
    process.exit(1);
  }

  // Find an admin user to set as createdBy / updatedBy
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin user found. Please create an admin account first.');
    process.exit(1);
  }
  console.log(`Using admin: ${admin.name} (${admin.email})`);

  const booksDir = path.join(__dirname, 'books');
  let created = 0;
  let skipped = 0;

  for (const seed of SEED_BOOKS) {
    // Skip if book with same ISBN already exists
    const existing = await Book.findOne({ isbn: seed.isbn, isDeleted: false });
    if (existing) {
      console.log(`  ⏭  "${seed.title}" already exists — skipping`);
      skipped++;
      continue;
    }

    // Read HTML file
    const htmlPath = path.join(booksDir, seed.htmlFile);
    if (!fs.existsSync(htmlPath)) {
      console.error(`  ✗  HTML file not found: ${htmlPath}`);
      continue;
    }
    const htmlBuffer = fs.readFileSync(htmlPath);

    // Create the book document first (without file)
    const book = await Book.create({
      title: seed.title,
      author: seed.author,
      isbn: seed.isbn,
      genre: seed.genre,
      description: seed.description,
      publishedYear: seed.publishedYear,
      totalCopies: seed.totalCopies,
      availableCopies: seed.totalCopies,
      status: 'available',
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    // Upload HTML to GridFS
    const fileId = await uploadToGridFS(db, htmlBuffer, seed.htmlFile, String(book._id));

    // Link the file to the book
    await Book.findByIdAndUpdate(book._id, {
      fileId,
      fileName: seed.htmlFile,
      fileMimeType: 'text/html',
    });

    console.log(`  ✓  "${seed.title}" created with HTML file (${htmlBuffer.length} bytes)`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
