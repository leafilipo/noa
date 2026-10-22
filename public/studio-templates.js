window.HS_PLATFORMS = { linkedin: { name: "LinkedIn", url: "https://www.linkedin.com/", max: 3000, sizes: [["1200×627", 1200, 627], ["1080×1350", 1080, 1350]] }, instagram: { name: "Instagram", url: "https://www.instagram.com/", max: 2200, sizes: [["1080×1350", 1080, 1350], ["1080×1080", 1080, 1080], ["1080×1920", 1080, 1920]] }, x: { name: "X", url: "https://x.com/", max: 280, sizes: [["1600×900", 1600, 900], ["1080×1080", 1080, 1080]] } };
// Content pillars and post templates. A pillar is a reason to post; every post carries one as a badge.
window.HS_PILLARS = [
  { id: "sighting", name: "Sighting", color: "#1E63D8", text: "A new specimen: a creature, a system or an instrument. Show it moving." },
  { id: "behaviour", name: "Behaviour", color: "#1B3FA0", text: "Something a known specimen does. A detail, a reaction, a habit." },
  { id: "field", name: "Field notes", color: "#5E5B55", text: "How it was made. Rules, tools, failed versions, sketches." },
  { id: "world", name: "World", color: "#8A4B2A", text: "The speculative side: where these things live and what that world is like." },
  { id: "instrument", name: "Instrument", color: "#1F6E3C", text: "A tool people can play with, and what came out of it." }
];
// {x} marks what to fill in.
window.HS_TEMPLATES = [
  { id: "sighting", pillar: "sighting", name: "New sighting", brief: "A new specimen. Its name, where it lives, one behaviour. Link to its page.", card: { text: "New sighting: {name}", label: "noa", bg: "#1E63D8", fg: "#FFFFFF" },
    texts: { linkedin: "New sighting: {name} ({latin name}).\n\nHabitat: {habitat}.\nBehaviour: {one behaviour}.\n\n{One line on how it was made.}\n\n{link}",
      instagram: "New sighting: {name}.\n{Habitat}. {One behaviour.}\n\n#digitalart #generativeart #speculativedesign",
      x: "New sighting: {name}. {One behaviour.} {link}" } },
  { id: "behaviour", pillar: "behaviour", name: "Behaviour", brief: "One thing a specimen does, filmed up close.", card: { text: "{name} {does what}", label: "noa", bg: "#DCD8D3", fg: "#1A1A1A" },
    texts: { linkedin: "{Name} {does what} when {condition}.\n\n{Why, or why you don't know yet.}", instagram: "{Name} {does what}.\n\n#creativecoding #generativeart", x: "{Name} {does what} when {condition}." } },
  { id: "field", pillar: "field", name: "Field note", brief: "How something was made: the rules, the tools, a version that failed.", card: { text: "Field note: {topic}", label: "noa", bg: "#1A1A1A", fg: "#DCD8D3" },
    texts: { linkedin: "Field note: {topic}.\n\n{The rule or trick, two sentences.}\n\n{What it looked like before.}", instagram: "Field note: {topic}. Swipe for the failed versions.\n\n#process #creativecoding", x: "Field note: {topic}. {One line.}" } },
  { id: "instrument", pillar: "instrument", name: "Instrument", brief: "A tool people can play with.", card: { text: "{Instrument} is open", label: "noa", bg: "#1E63D8", fg: "#FFFFFF" },
    texts: { linkedin: "{Instrument} is open to play with.\n\n{What it does, one line.}\n\n{link}", instagram: "{Instrument}: {what it does}. Link in bio.\n\n#generativeart #tools", x: "{Instrument} is open. {What it does.} {link}" } }
];
