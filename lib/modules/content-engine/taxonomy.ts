/**
 * Taxonomy constants, keyword packs, and Hindi translations
 * Source: Exam_Content_Engine-4.html
 */

export interface TaxonomyRow {
  subject: string
  topic: string
  keywords: string[]
}

export const PAL: string[] = [
  "#6366f1",
  "#ec4899",
  "#d97706",
  "#059669",
  "#0891b2",
  "#dc2626",
  "#7c3aed",
  "#65a30d",
  "#ea580c",
  "#0d9488",
]

export const BASE_T: [string, string, string[]][] = [
  ["Ancient India", "Indus Valley Civilization", ["indus", "harappa", "mohenjo", "kalibangan", "lothal", "dholavira", "archaeolog", "chanhudaro", "rakhigarhi", "great bath"]],
  ["Ancient India", "Vedic Age", ["vedic", "rigveda", "aryan", "upanishad", "brahmana", "sabha", "samiti"]],
  ["Ancient India", "Mahajanapadas and Mauryas", ["maurya", "ashoka", "mahajanapada", "magadha", "buddha", "mahavira", "bimbisara", "kautilya", "arthashastra", "nanda", "jain"]],
  ["Ancient India", "Gupta and Post-Gupta Age", ["gupta", "harsha", "kalidasa", "samudragupta", "vakataka", "pallava", "sangam", "satavahana", "kushan", "kanishka"]],
  ["Medieval India", "Delhi Sultanate", ["sultanate", "iltutmish", "balban", "alauddin", "tughlaq", "khalji", "razia", "lodi"]],
  ["Medieval India", "Mughal Empire", ["mughal", "akbar", "babur", "humayun", "shah jahan", "aurangzeb", "jahangir", "sher shah", "mansabdari"]],
  ["Medieval India", "Bhakti, Sufi and Regional Kingdoms", ["bhakti", "sufi", "kabir", "chola", "vijayanagar", "bahmani", "rajput", "nanak", "chaitanya", "maratha", "shivaji"]],
  ["Modern India", "Revolt of 1857", ["1857", "revolt", "mutiny", "kunwar singh", "lakshmibai", "mangal pandey", "nana sahib", "tantia", "bahadur shah", "nasirabad", "neemuch"]],
  ["Modern India", "Socio-Religious Reforms", ["samaj", "dayanand", "ram mohan", "vivekananda", "ramakrishna", "reform", "brahmo", "sir syed", "mission"]],
  ["Modern India", "Freedom Struggle", ["british", "congress", "gandhi", "viceroy", "governor-general", "plassey", "buxar", "independence", "non-cooperation", "swadeshi", "quit india", "nehru", "tilak", "east india company"]],
  ["Polity", "Constitution", ["article", "constitution", "preamble", "fundamental", "amendment", "directive principle"]],
  ["Polity", "Parliament and Executive", ["lok sabha", "rajya sabha", "parliament", "president", "prime minister", "speaker", "governor"]],
  ["Polity", "Judiciary", ["supreme court", "high court", "judge", "writ", "judiciary"]],
  ["Geography", "Indian Geography", ["river", "himalaya", "plateau", "monsoon", "soil", "delta", "ghats", "national park"]],
  ["Geography", "World Geography", ["continent", "ocean", "desert", "equator", "latitude", "volcano"]],
  ["Economy", "Banking and Finance", ["rbi", "bank", "repo", "inflation", "nabard", "sebi", "monetary"]],
  ["Economy", "Economy Basics", ["gdp", "budget", "tax", "fiscal", "five year plan", "niti aayog", "economy"]],
  ["Science", "Physics", ["force", "velocity", "newton", "electric", "current", "lens", "wavelength", "gravity"]],
  ["Science", "Chemistry", ["acid", "atom", "molecule", "element", "reaction", "alloy", "ph value"]],
  ["Science", "Biology", ["cell", "vitamin", "disease", "plant", "blood", "enzyme", "photosynthesis", "bacteria"]],
  ["Maths", "Arithmetic", ["percent", "profit", "loss", "ratio", "speed", "average", "interest", "discount", "train"]],
  ["Maths", "Algebra and Geometry", ["triangle", "circle", "equation", "polynomial", "angle", "perimeter"]],
  ["Reasoning", "Verbal and Non-Verbal", ["series", "coding", "odd one", "analogy", "venn", "direction", "blood relation"]],
  ["English", "Grammar and Vocabulary", ["synonym", "antonym", "idiom", "fill in the blank", "error", "passage", "tense"]],
  ["Current Affairs", "Recent Events", ["2026", "2025", "summit", "awarded", "appointed", "launched"]],
]

export const HK: Record<string, string[]> = {
  "Indus Valley Civilization": ["सिंधु", "हड़प्पा", "मोहनजोदड़ो", "लोथल", "कालीबंगा", "धौलावीरा"],
  "Vedic Age": ["वैदिक", "ऋग्वेद", "आर्य", "उपनिषद", "ब्राह्मण", "सभा", "समिति"],
  "Mahajanapadas and Mauryas": ["मौर्य", "अशोक", "महाजनपद", "मगध", "बुद्ध", "महावीर", "बिम्बिसार", "चाणक्य", "कौटिल्य", "अर्थशास्त्र", "नंद"],
  "Gupta and Post-Gupta Age": ["गुप्त", "हर्ष", "कालिदास", "समुद्रगुप्त", "वाकाटक", "पल्लव", "संगम", "सातवाहन", "कुषाण", "कनिष्क"],
  "Delhi Sultanate": ["सल्तनत", "इल्तुतमिश", "बलबन", "अलाउद्दीन", "तुगलक", "खिलजी", "रज़िया", "लोदी"],
  "Mughal Empire": ["मुग़ल", "मुगल", "अकबर", "बाबर", "हुमायूँ", "शाहजहाँ", "औरंगज़ेब", "औरंगजेब", "जहाँगीर", "शेरशाह", "मनसबदारी"],
  "Bhakti, Sufi and Regional Kingdoms": ["भक्ति", "सूफ़ी", "सूफी", "कबीर", "चोल", "विजयनगर", "बहमनी", "राजपूत", "नानक", "चैतन्य", "मराठा", "शिवाजी"],
  "Revolt of 1857": ["1857", "विद्रोह", "क्रांति", "मंगल पांडे", "लक्ष्मीबाई", "नाना साहेब", "तात्या", "कुँवर सिंह", "बहादुरशाह"],
  "Socio-Religious Reforms": ["समाज सुधार", "आर्य समाज", "दयानंद", "राममोहन", "विवेकानंद", "रामकृष्ण", "ब्रह्म समाज", "सर सैयद", "सुधार आंदोलन"],
  "Freedom Struggle": ["ब्रिटिश", "अंग्रेज", "कांग्रेस", "गांधी", "वायसराय", "गवर्नर जनरल", "प्लासी", "बक्सर", "स्वतंत्रता", "असहयोग", "स्वदेशी", "भारत छोड़ो", "नेहरू", "तिलक", "ईस्ट इंडिया"],
  "Constitution": ["अनुच्छेद", "संविधान", "प्रस्तावना", "मौलिक", "संशोधन", "नीति निर्देशक"],
  "Parliament and Executive": ["लोकसभा", "राज्यसभा", "संसद", "राष्ट्रपति", "प्रधानमंत्री", "अध्यक्ष", "राज्यपाल"],
  "Judiciary": ["उच्चतम न्यायालय", "सर्वोच्च न्यायालय", "उच्च न्यायालय", "न्यायाधीश", "रिट", "न्यायपालिका"],
  "Indian Geography": ["नदी", "हिमालय", "पठार", "मानसून", "मृदा", "मिट्टी", "डेल्टा", "घाट", "राष्ट्रीय उद्यान"],
  "World Geography": ["महाद्वीप", "महासागर", "मरुस्थल", "रेगिस्तान", "विषुवत", "अक्षांश", "ज्वालामुखी"],
  "Banking and Finance": ["आरबीआई", "रिज़र्व बैंक", "बैंक", "रेपो", "मुद्रास्फीति", "नाबार्ड", "सेबी", "मौद्रिक"],
  "Economy Basics": ["जीडीपी", "बजट", "कर", "राजकोषीय", "पंचवर्षीय", "नीति आयोग", "अर्थव्यवस्था"],
  "Physics": ["बल", "वेग", "न्यूटन", "विद्युत", "धारा", "लेंस", "तरंग"],
  "Chemistry": ["अम्ल", "परमाणु", "अणु", "तत्व", "अभिक्रिया", "मिश्र धातु"],
  "Biology": ["कोशिका", "विटामिन", "रोग", "पादप", "पौधे", "रक्त", "एंजाइम", "प्रकाश संश्लेषण"],
  "Arithmetic": ["प्रतिशत", "लाभ", "हानि", "अनुपात", "चाल", "औसत", "ब्याज", "छूट"],
  "Algebra and Geometry": ["त्रिभुज", "वृत्त", "समीकरण", "बहुपद", "कोण", "परिमाप"],
  "Verbal and Non-Verbal": ["श्रृंखला", "शृंखला", "कोडिंग", "विषम", "सादृश्य", "वेन", "दिशा", "रक्त संबंध"],
  "Grammar and Vocabulary": ["पर्यायवाची", "विलोम", "मुहावरे", "रिक्त स्थान", "अनुच्छेद"],
  "Recent Events": ["शिखर सम्मेलन", "पुरस्कार", "नियुक्त", "शुभारंभ", "2025", "2026"],
}

export const EXTRA_T: [string, string, string[]][] = [
  ["Sociology", "Society and Social Institutions", ["society", "social", "culture", "family", "caste", "community", "civilization", "समाज", "सामाजिक", "संस्कृति", "परिवार", "जाति", "समुदाय", "मानव", "सभ्यता", "संस्था"]],
  ["Education", "Teaching and Pedagogy", ["teaching", "pedagogy", "learning", "curriculum", "child development", "शिक्षण", "शिक्षा", "अधिगम", "पाठ्यक्रम", "बाल विकास", "शिक्षक", "विद्यार्थी"]],
  ["Environment", "Ecology and Biodiversity", ["ecosystem", "biodiversity", "pollution", "climate", "wildlife", "पर्यावरण", "पारिस्थितिक", "जैव विविधता", "प्रदूषण", "जलवायु", "वन्यजीव"]],
  ["Art & Culture", "Indian Art and Culture", ["temple", "dance", "painting", "architecture", "festival", "मंदिर", "नृत्य", "चित्रकला", "स्थापत्य", "त्योहार", "साहित्य", "लोक कला"]],
  ["Computer", "Computer Awareness", ["computer", "software", "internet", "hardware", "कंप्यूटर", "सॉफ्टवेयर", "इंटरनेट"]],
  ["Hindi", "Hindi Grammar and Literature", ["संधि", "समास", "अलंकार", "कारक", "छंद", "काव्य", "रस "]],
]

export const EXTRA_INDUS_KEYWORDS = [
  "सैन्धव", "सैंधव", "सिन्धु", "हड़प्पाई", "हड़प्पीय", "चन्हूदड़ो", "बनावली", "सुरकोटदा", "राखीगढ़ी", "मेहरगढ़",
  "रोपड़", "रंगपुर", "आलमगीरपुर", "स्नानागार", "अन्नागार", "नगर नियोजन", "मृद्भांड", "मृदभांड", "पुरातात्त्विक",
  "पुरातात्विक", "उत्खनन", "पुरातत्व", "पुरातत्त्व", "चित्रित मृद्", "मुहरें", "मातृदेवी", "पशुपति", "दुर्ग",
  "granary", "citadel", "painted pottery", "pottery", "seal", "mother goddess", "pashupati", "bronze",
  "terracotta", "ropar", "banawali", "surkotada", "rangpur", "alamgirpur", "sindhu", "saindhava"
]

export const SUBHI: Record<string, string> = {
  "Ancient India": "प्राचीन भारत",
  "Medieval India": "मध्यकालीन भारत",
  "Modern India": "आधुनिक भारत",
  History: "इतिहास",
  Polity: "राजव्यवस्था",
  Geography: "भूगोल",
  Economy: "अर्थव्यवस्था",
  Science: "विज्ञान",
  Maths: "गणित",
  Reasoning: "तर्कशक्ति",
  English: "अंग्रेज़ी",
  "Current Affairs": "समसामयिकी",
  Sociology: "समाजशास्त्र",
  Education: "शिक्षा",
  Environment: "पर्यावरण",
  "Art & Culture": "कला एवं संस्कृति",
  Computer: "कंप्यूटर",
  Hindi: "हिन्दी",
  Uncategorized: "अवर्गीकृत",
}

export const TOPHI: Record<string, string> = {
  "Indus Valley Civilization": "सिंधु घाटी सभ्यता",
  "Vedic Age": "वैदिक काल",
  "Mahajanapadas and Mauryas": "महाजनपद एवं मौर्य",
  "Gupta and Post-Gupta Age": "गुप्त एवं गुप्तोत्तर काल",
  "Delhi Sultanate": "दिल्ली सल्तनत",
  "Mughal Empire": "मुग़ल साम्राज्य",
  "Bhakti, Sufi and Regional Kingdoms": "भक्ति, सूफ़ी एवं क्षेत्रीय राज्य",
  "Revolt of 1857": "1857 का विद्रोह",
  "Socio-Religious Reforms": "सामाजिक-धार्मिक सुधार",
  "Freedom Struggle": "स्वतंत्रता संग्राम",
  Constitution: "संविधान",
  "Parliament and Executive": "संसद एवं कार्यपालिका",
  Judiciary: "न्यायपालिका",
  "Indian Geography": "भारत का भूगोल",
  "World Geography": "विश्व भूगोल",
  "Banking and Finance": "बैंकिंग एवं वित्त",
  "Economy Basics": "अर्थव्यवस्था की मूल बातें",
  Physics: "भौतिक विज्ञान",
  Chemistry: "रसायन विज्ञान",
  Biology: "जीव विज्ञान",
  Arithmetic: "अंकगणित",
  "Algebra and Geometry": "बीजगणित एवं ज्यामिति",
  "Verbal and Non-Verbal": "शाब्दिक एवं अशाब्दिक",
  "Grammar and Vocabulary": "व्याकरण एवं शब्दावली",
  "Recent Events": "हाल की घटनाएँ",
  "Society and Social Institutions": "समाज एवं सामाजिक संस्थाएँ",
  "Teaching and Pedagogy": "शिक्षण एवं शिक्षाशास्त्र",
  "Ecology and Biodiversity": "पारिस्थितिकी एवं जैव विविधता",
  "Indian Art and Culture": "भारतीय कला एवं संस्कृति",
  "Computer Awareness": "कंप्यूटर जागरूकता",
  "Hindi Grammar and Literature": "हिन्दी व्याकरण एवं साहित्य",
  General: "सामान्य",
}

/**
 * Build the full runtime keyword table T
 */
export function buildTaxonomyTable(): [string, string, string[]][] {
  const table: [string, string, string[]][] = BASE_T.map(([sub, top, kw]) => [sub, top, [...kw]])

  // Append HK keywords
  table.forEach((row) => {
    const hk = HK[row[1]]
    if (hk) row[2].push(...hk)
  })

  // Append Extra topics
  EXTRA_T.forEach((row) => table.push([row[0], row[1], [...row[2]]]))

  // Append Extra Indus keywords
  const indusRow = table.find((r) => r[1] === "Indus Valley Civilization")
  if (indusRow) {
    indusRow[2].push(...EXTRA_INDUS_KEYWORDS)
  }

  return table
}

export const T = buildTaxonomyTable()
export const SUBS = [...new Set(T.map((r) => r[0]))]
export const HS = ["Ancient India", "Medieval India", "Modern India"]

export function getHindiSubject(sub: string, customMap?: Record<string, string>): string {
  if (customMap && customMap[sub]) return customMap[sub]
  return SUBHI[sub] || sub
}

export function getHindiTopic(top: string, customMap?: Record<string, string>): string {
  if (customMap && customMap[top]) return customMap[top]
  return TOPHI[top] || top
}
