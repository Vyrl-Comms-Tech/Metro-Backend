// Jewellery > subcategory > options. Products store these titles as subCategory and category.
const JEWELLERY_TREE = [
  { title: 'Earrings', options: ['Diamond Studs', 'Diamond Hoops', 'Fashion Drops', 'Fashion Studs', 'Letter Studs'] },
  { title: 'Necklaces', options: ['Diamond Pendants', 'Fashion Pendants', 'English Letter Pendants', 'Arabic Letter Pendants'] },
  { title: 'Rings', options: ['Plain', 'Diamond', 'Exclusive Engagement Rings', 'Eternity Rings', 'Gemstone Rings', 'Fashion Rings', 'Constellation Rings', 'Fancy Coloured Diamond Rings'] },
  { title: 'Bracelets', options: ['Tennis Bracelets', 'Letter Bracelets'] },
]

// Starting collections. `image` is a file name in /public, copied into uploads by the seed.
const CATEGORIES_RAW = [
  {
    title: 'Engagement Rings',
    slug: 'engagement-rings',
    subCategories: ['Solitaire', 'Halo', 'Three Stone', 'Fancy Coloured'],
    description: 'Design a ring made for your story',
    tag: 'Most Loved',
    image: 'd3.jpg',
  },
  {
    title: 'Wedding Rings',
    slug: 'wedding-rings',
    subCategories: ['Female Wedding Rings', 'Male Wedding Rings', 'Eternity Rings'],
    description: 'Bands for every hand',
    image: 'd3.jpg',
  },
  {
    title: 'Earrings',
    slug: 'earrings',
    subCategories: ['Diamond Studs', 'Hoop Earrings', 'Drop Earrings', 'Letter Studs'],
    description: 'Studs, hoops and drops',
    image: 'd7.jpg',
  },
  {
    title: 'Bracelets',
    slug: 'bracelets',
    subCategories: ['Tennis Bracelets', 'Letter Bracelets'],
    description: 'Tennis and letter bracelets',
    tag: 'New In',
    image: 'd4.jpg',
  },
  {
    title: 'Necklaces',
    slug: 'necklaces',
    subCategories: ['Diamond Pendants', 'Name Necklaces', 'Letter Pendants'],
    description: 'Pendants and name necklaces',
    image: 'd6.jpg',
  },
  {
    title: 'Loose Diamond',
    slug: 'loose-diamond',
    subCategories: ['Natural Diamond', 'Lab Grown Diamond'],
    description: 'Explore natural and lab grown loose diamonds',
  },
  {
    title: 'Diamonds',
    slug: 'diamonds',
    subCategories: ['Natural Diamond', 'Lab Grown Diamond'],
    description: 'Discover natural and lab grown diamonds',
  },
  {
    title: 'Jewellery',
    slug: 'jewellery',
    subCategories: [...JEWELLERY_TREE],
    description: 'Explore the full collection',
    image: 'd8.jpg',
  },
  {
    title: 'Sale Items',
    slug: 'sale-items',
    subCategories: ['Rings', 'Earrings', 'Bracelets', 'Necklaces'],
    showOnHome: false,
  },
]

// plain names are shorthand for a subcategory without options
const CATEGORIES = CATEGORIES_RAW.map((c) => ({
  ...c,
  subCategories: c.subCategories.map((s) => (typeof s === 'string' ? { title: s, options: [] } : s)),
}))

module.exports = { CATEGORIES, JEWELLERY_TREE }
