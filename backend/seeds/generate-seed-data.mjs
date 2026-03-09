/* eslint-disable */
// generate-seed-data.mjs — Run with: node seeds/generate-seed-data.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksDir = path.join(__dirname, 'books');
const outFile = path.join(__dirname, '..', 'src', 'seeds', 'book-data.ts');

const booksMeta = [
  { file: 'dune.html', title: 'Dune', author: 'Frank Herbert', isbn: '978-0-441-17271-9', genre: 'Science Fiction', description: 'Set in the distant future, Dune tells the story of Paul Atreides and the struggle for control of the desert planet Arrakis \u2014 the only source of the most valuable substance in the universe.', publishedYear: 1965, totalCopies: 5 },
  { file: 'neuromancer.html', title: 'Neuromancer', author: 'William Gibson', isbn: '978-0-441-56956-4', genre: 'Science Fiction', description: 'The novel that launched the cyberpunk movement. A washed-up hacker is hired for one last job \u2014 the most daring hack in the history of cyberspace.', publishedYear: 1984, totalCopies: 4 },
  { file: 'brave-new-world.html', title: 'Brave New World', author: 'Aldous Huxley', isbn: '978-0-06-085052-4', genre: 'Science Fiction', description: 'A dystopian vision of a future where humanity is perfected through genetic engineering, conditioning, and the pleasure drug soma \u2014 at the cost of freedom and meaning.', publishedYear: 1932, totalCopies: 6 },
  { file: 'pride-and-prejudice.html', title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '978-0-14-143951-8', genre: 'Classic Literature', description: 'A sparkling comedy of manners following the turbulent relationship between Elizabeth Bennet and Mr. Darcy in Regency-era England.', publishedYear: 1813, totalCopies: 5 },
  { file: '1984.html', title: '1984', author: 'George Orwell', isbn: '978-0-451-52493-5', genre: 'Classic Literature', description: 'The defining dystopian novel. Winston Smith struggles against the totalitarian regime of Big Brother in a world where truth itself is controlled by the Party.', publishedYear: 1949, totalCopies: 7 },
  { file: 'great-gatsby.html', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0-7432-7356-5', genre: 'Classic Literature', description: 'A shimmering portrait of the Jazz Age. Jay Gatsby throws lavish parties in pursuit of an impossible dream \u2014 to recapture a lost love across the bay.', publishedYear: 1925, totalCopies: 4 },
  { file: 'meditations.html', title: 'Meditations', author: 'Marcus Aurelius', isbn: '978-0-14-044933-4', genre: 'Philosophy', description: 'The private journals of the Roman Emperor \u2014 a timeless guide to Stoic philosophy, self-discipline, and finding inner peace amidst the chaos of life.', publishedYear: 180, totalCopies: 5 },
  { file: 'the-republic.html', title: 'The Republic', author: 'Plato', isbn: '978-0-14-044914-3', genre: 'Philosophy', description: 'One of the most influential works in Western thought. Socrates explores the nature of justice, the ideal state, and the Allegory of the Cave.', publishedYear: -375, totalCopies: 4 },
  { file: 'beyond-good-and-evil.html', title: 'Beyond Good and Evil', author: 'Friedrich Nietzsche', isbn: '978-0-14-044923-5', genre: 'Philosophy', description: 'Nietzsche challenges the foundations of Western morality and calls for free spirits who dare to create their own values beyond inherited dogma.', publishedYear: 1886, totalCopies: 3 },
];

// Ensure output directory exists
const outDir = path.dirname(outFile);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let output = `/**
 * Auto-generated seed data with inline HTML content.
 * Generated from seeds/books/*.html — do not edit manually.
 * Regenerate: node seeds/generate-seed-data.mjs
 */

export interface SeedBook {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  publishedYear: number;
  totalCopies: number;
  fileName: string;
  htmlContent: string;
}

export const SEED_BOOKS: SeedBook[] = [\n`;

for (const meta of booksMeta) {
  const html = fs.readFileSync(path.join(booksDir, meta.file), 'utf8');
  // JSON.stringify safely escapes all special chars for a string literal
  output += `  {
    title: ${JSON.stringify(meta.title)},
    author: ${JSON.stringify(meta.author)},
    isbn: ${JSON.stringify(meta.isbn)},
    genre: ${JSON.stringify(meta.genre)},
    description: ${JSON.stringify(meta.description)},
    publishedYear: ${meta.publishedYear},
    totalCopies: ${meta.totalCopies},
    fileName: ${JSON.stringify(meta.file)},
    htmlContent: ${JSON.stringify(html)},
  },\n`;
}

output += `];\n`;

fs.writeFileSync(outFile, output);
console.log(`Generated ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);
