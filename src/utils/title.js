// The full name of one variation: carat, stone type, product name, metal colour.
//   "Diamond Tennis Bracelet" + 2ct / Lab Grown / 18k White Gold -> "2ct Lab-Grown Diamond Tennis Bracelet White Gold"
// A name that starts with its carat keeps it first: "13ct Black Diamond Tennis Bracelet" -> "13ct Natural Black Diamond Tennis Bracelet Rose Gold"
// A name with a " - X" tail (letter bracelets) keeps it last: "Diamond Letter Bracelet - A" -> "... Bracelet White Gold - A"
function variantTitle(name = '', { carat, type, metal } = {}) {
  const [, named, tail] = name.match(/^(.*?)(?:\s+-\s+(.+))?$/)
  // a name that still starts with its carat ("13ct Black Diamond Tennis Bracelet") keeps it first, before the stone type
  const [, nameCarat, base] = named.match(/^(\d+(?:\.\d+)?ct)\s+(.*)$/i) ?? [, undefined, named]
  return [
    carat != null ? `${carat}ct` : nameCarat,
    type === 'Lab Grown' ? 'Lab-Grown' : type,
    base,
    metal?.replace(/^18k\s+/i, '').replace(/\b\w/g, (c) => c.toUpperCase()),
    tail && `- ${tail}`,
  ]
    .filter(Boolean)
    .join(' ')
}

module.exports = { variantTitle }
