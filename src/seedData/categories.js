// Starting collections. `image` is a file name in /public, copied into uploads by the seed.
const CATEGORIES = [
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
    subCategories: ['Rings', 'Earrings', 'Necklaces', 'Bracelets', 'Exclusive Pieces'],
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

module.exports = { CATEGORIES }
