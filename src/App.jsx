import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { recentDiscoveries } from './data/recentDiscoveries'
import { pickBestCommonsImage, searchCommonsImages } from './utils/commons'
import { getTodayContext } from './data/hinduCalendar'
import { CIRCUITS } from './data/circuits'
import { REGIONS } from './data/regionMap'

const placeholderImages = [
  '/temples/temple-01.svg',
  '/temples/temple-02.svg',
  '/temples/temple-03.svg',
  '/temples/temple-04.svg',
  '/temples/temple-05.svg',
  '/temples/temple-06.svg',
]

const getPlaceholderImage = (name) => {
  const total = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return placeholderImages[total % placeholderImages.length]
}

const ALL_STATES = 'All States'
const ALL_CITIES = 'All Cities'
const PAGE_SIZE = 12
const SEARCH_PAGE_SIZE = 12
const RECENT_PAGE_SIZE = 6
const NEWLY_ADDED_PAGE_SIZE = 6
const NEWLY_ADDED_LIMIT = 120
const NEWLY_ADDED_DISPLAY = 8
const NOT_AVAILABLE_TEXT = 'Not Available'
const MODES = {
  SHIVA: 'shiva',
  SHAKTI: 'shakti',
}
const FOCUS_STATES = [
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Tamil Nadu',
  'West Bengal',
  'Uttarakhand',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Karnataka',
  'Kerala',
  'Odisha',
  'Haryana',
  'Andhra Pradesh',
  'Bihar',
  'Tripura',
  'Arunachal Pradesh',
  'Jharkhand',
  'Assam',
  'Telangana',
  'Chhattisgarh',
]
const normalizeTempleKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

// 12 canonical Jyotirlinga locations — match by tag + state/city instead of name
// because JS data files use different temple name formats than the API data store
const CANONICAL_JYOTIRLINGA_LOCATIONS = new Set([
  'gujarat|prabhaspatan',       // Somnath
  'andhrapradesh|srisailam',    // Mallikarjuna
  'madhyapradesh|ujjain',       // Mahakaleshwar
  'madhyapradesh|omkareshwar',  // Omkareshwar
  'uttarakhand|kedarnath',      // Kedarnath
  'maharashtra|bhimashankar',   // Bhimashankar
  'uttarpradesh|varanasi',      // Kashi Vishwanath
  'maharashtra|trimbak',        // Trimbakeshwar
  'jharkhand|deoghar',          // Baidyanath
  'gujarat|dwarka',             // Nageshvara
  'tamilnadu|rameswaram',       // Ramanathaswamy
  'maharashtra|verul',          // Grishneshwar
])
const PAGE_TRACKING_PATHS = {
  temples: '/temples',
  recent: '/recent-discoveries',
  circuits: '/circuits',
  map: '/map',
  about: '/about',
}
const PAGE_TRACKING_TITLES = {
  temples: 'Temples',
  recent: 'Recent Discoveries',
  circuits: 'Circuits',
  map: 'Map',
  about: 'About',
}
const DEFAULT_PAGE = 'temples'
const normalizeRoutePath = (pathname = '/') => {
  const normalized = String(pathname || '').replace(/\/+$/, '')
  return normalized || '/'
}
const resolvePageFromPath = (pathname = '/') => {
  const normalized = normalizeRoutePath(pathname)
  if (normalized === '/') return DEFAULT_PAGE
  const match = Object.entries(PAGE_TRACKING_PATHS).find(
    ([, routePath]) => normalized === routePath || normalized.startsWith(`${routePath}/`)
  )
  return match ? match[0] : DEFAULT_PAGE
}
const API_MODE_ENABLED = String(import.meta.env.VITE_USE_TEMPLE_API || '').toLowerCase() === 'true'
const API_BASE_URL = String(import.meta.env.VITE_TEMPLE_API_BASE_URL || 'http://127.0.0.1:8787').replace(
  /\/$/,
  ''
)
const FEEDBACK_EMAIL = String(import.meta.env.VITE_FEEDBACK_EMAIL || '')
const slugify = (value) =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildApiQuery = (paramsObject = {}) => {
  const params = new URLSearchParams()
  Object.entries(paramsObject).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return params.toString()
}

const fetchTempleApiJson = async (path, signal) => {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal })
  if (!response.ok) {
    throw new Error(`Temple API request failed (${response.status})`)
  }
  return response.json()
}

const loadLocalTempleModules = async () => {
  const [templesModule, andhraModule] = await Promise.all([
    import('./data/temples'),
    import('./data/temples/andhraPradesh'),
  ])
  return {
    shiva: Array.isArray(templesModule?.templeData) ? templesModule.templeData : [],
    shakti: Array.isArray(templesModule?.shaktiTempleData) ? templesModule.shaktiTempleData : [],
    andhra: Array.isArray(andhraModule?.andhraPradeshTemples)
      ? andhraModule.andhraPradeshTemples
      : [],
  }
}

const copy = {
  en: {
    portalName: 'Jai Bhole Nath',
    heroTitle: 'Sacred Temples of India',
    heroSubtitle: "Stories, rituals, and living traditions from India's sacred landscape.",
    heroActions: {
      start: 'Start a Journey',
      view: "Editor's Picks",
      search: 'Browse by State',
    },
    heroStory: {
      eyebrow: 'Temple of the day',
      title: 'A curated temple story for today',
      read: 'Read story',
      browse: "Browse editor's picks",
    },
    heroProof: {
      sources: 'Verified entries',
    },
    heroJourneys: {
      title: 'Quick journeys',
      items: [
        { label: 'Jyotirlinga', term: 'jyotirlinga' },
        { label: 'Ancient', term: 'ancient' },
        { label: 'Ritual-rich', term: 'aarti' },
        { label: 'Riverside', term: 'river' },
        { label: 'Festival-heavy', term: 'mahashivratri' },
      ],
    },
    nav: {
      label: 'Primary navigation',
      temples: 'Temples',
      recent: 'Recent Discoveries',
      circuits: 'Circuits',
      map: 'Map',
      about: 'About',
    },
    stats: {
      states: 'States listed',
      temples: 'Temples mapped',
      cities: 'Cities covered',
    },
    panel: {
      title: 'Find a Temple',
      subtitle: 'Pick a state, choose a city, and explore the living heritage.',
      searchLabel: 'Search',
      searchPlaceholder: 'Search',
      stateLabel: 'State',
      cityLabel: 'City',
      savedOnly: 'Saved',
      showAll: 'Show all',
      clearFilters: 'Clear filters',
      deityLabel: 'Deity',
      traditionLabel: 'Tradition',
      festivalLabel: 'Festival',
      bestTimeLabel: 'Best time',
      allStates: 'Filter by State',
      allCities: 'Filter by City',
      allDeities: 'Filter by Deity',
      allTraditions: 'All Traditions',
      allFestivals: 'All Festivals',
      allBestTimes: 'All Best Times',
      showing: (count) => `Showing ${count} editor's picks`,
      helper: "Tip: select a state to reveal editor's picks below.",
      explore: "Explore editor's picks below",
      save: 'Save this route',
    },
    labels: {
      allStates: 'All States',
    },
    trailsSection: {
      title: 'Curated Trails',
      subtitle: 'Start with a guided path chosen for story richness and ritual depth.',
      items: [
        {
          title: 'Shakti Peeth Journey',
          description:
            'Powerful Devi shrines that map the living Shakti tradition across regions.',
          action: 'Explore Shakti trail',
          tag: 'Shakta focus',
        },
        {
          title: 'Krishna Leela Circuit',
          description:
            'Sacred places that keep Krishna’s leelas alive through daily worship and festival lore.',
          action: 'Explore Krishna trail',
          tag: 'Vaishnava focus',
        },
        {
          title: 'Ancient Shaiva Sanctums',
          description:
            'Historic Shiva temples and jyotirlinga traditions that anchor timeless devotion.',
          action: 'Explore Shaiva trail',
          tag: 'Shaiva focus',
        },
      ],
    },
    topSection: {
      featuredTitle: 'Featured temples',
      featuredSubtitle: 'Begin with a few sacred journeys.',
      storiesTitle: 'Latest stories',
      storiesSubtitle: 'Short reads from recently added temples.',
    },
    statesSection: {
      title: 'States of Spiritual Significance',
      subtitle: 'Scan through the regions and unlock stories rooted in geography and devotion.',
    },
    cardsSection: {
      title: "Editor's Picks",
      subtitle: 'Handpicked temple stories and themed collections to read in depth.',
    },
    newlyAddedSection: {
      title: 'New to the Atlas',
      subtitle: 'The latest temples documented as new research comes in.',
      seeAll: 'See all recently added',
      showLess: 'Show less',
      tierLabels: { today: 'Today', thisWeek: 'This week', thisMonth: 'This month', earlier: 'Earlier' },
    },
    searchSection: {
      title: 'Search results',
      subtitle: (count) => `${count} temples matched your filters.`,
    },
    searchEmpty: {
      title: 'No matches for the current filters.',
      body: 'Try clearing a filter or search term to see more temples.',
    },
    highlightLabel: 'Highlight',
    readFullStory: 'Read Story',
    emptyState: {
      title: 'More temple stories are on the way.',
      body:
        'We are expanding state-by-state coverage. Select another region or request a temple to prioritize next.',
      cta: 'Request a temple',
    },
    featuresSection: {
      title: 'Designed for Pilgrims and Seekers',
      subtitle: 'A modern experience for timeless journeys.',
      items: [
        {
          title: 'State to City Discovery',
          text: 'Navigate India by state, drill into cities, and discover spiritual heritage with clarity.',
        },
        {
          title: 'Living Temple Stories',
          text: 'Concise storytelling focused on rituals, regional traditions, and cultural context.',
        },
        {
          title: 'Pilgrimage Intelligence',
          text: 'Highlights, best moments, and atmosphere notes that help plan meaningful visits.',
        },
      ],
    },
    aboutSection: {
      eyebrow: 'About Us',
      title: 'Jai Bhole Nath is a living archive of sacred geography.',
      subtitle:
        'We curate temple stories so seekers can explore India’s spiritual landscape with clarity and respect.',
      cards: [
        {
          title: 'Our intent',
          body: 'Build a respectful portal that keeps temple lore, ritual rhythm, and regional context alive.',
        },
        {
          title: 'What we curate',
          body: 'Temple stories, key rituals, best visit windows, and verified imagery sourced from public archives.',
        },
        {
          title: 'How to use it',
          body: 'Choose a state, read a story, and plan your visit with cultural sensitivity and local traditions in mind.',
        },
      ],
    },
    disclaimerSection: {
      title: 'Disclaimer',
      body:
        'Information here is curated from public sources and community inputs. Details may vary by local tradition and temple administration. Please verify timings, rituals, and access rules with official temple sources before visiting.',
      note: 'If you notice an error, share a correction so we can update it.',
    },
    recentSection: {
      title: 'Recent Discoveries',
      subtitle:
        'Newly reported or rediscovered Shiva shrines, temple bases, and sacred finds. Some details are still being verified.',
      emptyTitle: 'More discoveries are on the way.',
      emptyBody: 'We will add newly reported finds as they are verified. Check back soon.',
      shaktiOnlyTitle: 'Available in Shiva mode',
      shaktiOnlyBody: 'This section tracks Shaiva discoveries. Switch to Shiva mode to view it.',
      note:
        'These entries summarize recent reports. Rituals, access, and exact chronology may evolve as research continues.',
      pending: 'Details pending',
      labels: {
        period: 'Estimated era',
        source: 'Source',
        status: 'Status',
      },
    },
    modeToggle: {
      label: 'Temple focus',
      shiva: 'Shiva Mode',
      shakti: 'Shakti Mode',
    },
    modal: {
      eyebrow: 'Temple Story',
      close: 'Close',
      story: 'Story',
      signature: 'Signature Moment',
      coreDetails: 'Core Details',
      rituals: 'Rituals',
      festivals: 'Festivals',
      more: 'More details',
      sources: 'Sources',
      puranicSources: 'Puranic sources',
      folkloreSources: 'Folklore sources',
      empty:
        'We are expanding each temple with verified history, festival calendars, and practical visit notes. Share any sources or traditions you want included.',
      report: 'Suggest a Correction',
      reportNote: 'Spotted an error or missing detail?',
      share: 'Share',
      copied: 'Copied!',
      save: 'Save',
      saved: 'Saved',
      similarTitle: 'You may also explore',
      visited: 'Visited',
      markVisited: 'Mark visited',
    },
    circuitsTitle: 'Pilgrimage Circuits',
    circuitsSubtitle: 'Track your yatra across sacred circuits.',
    circuitsProgress: (done, total) => `${done} of ${total}`,
    mapTitle: 'Explore by Region',
    mapSubtitle: 'Browse sacred temples across India by geography.',
    templeCount: (n) => `${n} temple${n === 1 ? '' : 's'}`,
    cal: {
      todayLabel: 'Today',
    },
    details: {
      deity: 'Deity',
      tradition: 'Tradition',
      bestTime: 'Best time',
      timings: 'Timings',
      dressCode: 'Dress code',
      entryNotes: 'Entry notes',
    },
    moreLabels: {
      history: 'History',
      puranic: 'Puranic view',
      folklore: 'Folklore',
      architecture: 'Architecture',
      darshan: 'Darshan & Aarti',
      seasonal: 'Seasonal notes',
      visitorNotes: 'Visitor notes',
      festivals: 'Festivals',
    },
    language: {
      label: 'Language',
      en: 'English',
      hi: 'हिंदी',
    },
  },
  hi: {
    portalName: 'जय भोलेनाथ',
    heroTitle: 'भारत के पवित्र मंदिर',
    heroSubtitle: 'भारत के पवित्र तीर्थों की कथाएँ, अनुष्ठान और जीवंत परंपराएँ।',
    heroActions: {
      start: 'यात्रा शुरू करें',
      view: 'संपादक चयन',
      search: 'राज्य के अनुसार देखें',
    },
    heroStory: {
      eyebrow: 'आज का मंदिर',
      title: 'आज की क्यूरेटेड मंदिर कथा',
      read: 'कथा पढ़ें',
      browse: 'चयनित मंदिर देखें',
    },
    heroProof: {
      sources: 'सत्यापित प्रविष्टियाँ',
    },
    heroJourneys: {
      title: 'त्वरित यात्राएँ',
      items: [
        { label: 'ज्योतिर्लिंग', term: 'jyotirlinga' },
        { label: 'प्राचीन', term: 'ancient' },
        { label: 'अनुष्ठान-समृद्ध', term: 'aarti' },
        { label: 'नदी तट', term: 'river' },
        { label: 'त्योहार-प्रधान', term: 'mahashivratri' },
      ],
    },
    nav: {
      label: 'मुख्य नेविगेशन',
      temples: 'मंदिर',
      recent: 'हाल की खोजें',
      circuits: 'यात्राएं',
      map: 'मानचित्र',
      about: 'परिचय',
    },
    stats: {
      states: 'सूचीबद्ध राज्य',
      temples: 'मानचित्रित मंदिर',
      cities: 'शामिल शहर',
    },
    panel: {
      title: 'मंदिर खोजें',
      subtitle: 'राज्य चुनें, शहर चुनें और जीवंत विरासत देखें।',
      searchLabel: 'खोजें',
      searchPlaceholder: 'खोजें',
      stateLabel: 'राज्य',
      cityLabel: 'शहर',
      savedOnly: 'सहेजे गए',
      showAll: 'सभी दिखाएं',
      clearFilters: 'फ़िल्टर साफ़ करें',
      deityLabel: 'देवता',
      traditionLabel: 'संप्रदाय',
      festivalLabel: 'त्योहार',
      bestTimeLabel: 'सर्वश्रेष्ठ समय',
      allStates: 'राज्य चुनें',
      allCities: 'शहर चुनें',
      allDeities: 'देवता चुनें',
      allTraditions: 'सभी संप्रदाय',
      allFestivals: 'सभी त्योहार',
      allBestTimes: 'सभी सर्वोत्तम समय',
      showing: (count) => `${count} संपादक चयन दिख रहे हैं`,
      helper: 'संकेत: नीचे दिखने वाले मंदिरों के लिए राज्य चुनें।',
      explore: 'नीचे चुनिंदा मंदिर देखें',
      save: 'इस मार्ग को सहेजें',
    },
    labels: {
      allStates: 'सभी राज्य',
    },
    trailsSection: {
      title: 'क्यूरेटेड यात्राएँ',
      subtitle: 'कहानी और परंपरा के आधार पर चुने गए मार्गों से शुरुआत करें।',
      items: [
        {
          title: 'शक्ति पीठ यात्रा',
          description: 'देवी परंपरा के प्रमुख शक्ति पीठ और शक्तिस्थल।',
          action: 'शक्ति यात्रा देखें',
          tag: 'शाक्त परंपरा',
        },
        {
          title: 'कृष्ण लीला परिक्रमा',
          description: 'वृंदावन से द्वारका तक कृष्ण लीला से जुड़े पवित्र स्थल।',
          action: 'कृष्ण यात्रा देखें',
          tag: 'वैष्णव परंपरा',
        },
        {
          title: 'प्राचीन शैव धाम',
          description: 'शिव उपासना और ज्योतिर्लिंग परंपरा के ऐतिहासिक मंदिर।',
          action: 'शैव यात्रा देखें',
          tag: 'शैव परंपरा',
        },
      ],
    },
    topSection: {
      featuredTitle: 'चुने हुए मंदिर',
      featuredSubtitle: 'शुरुआत के लिए कुछ पवित्र यात्रा संकेत।',
      storiesTitle: 'नई मंदिर कथाएँ',
      storiesSubtitle: 'हाल ही में जोड़ी गई संक्षिप्त कथाएँ।',
    },
    statesSection: {
      title: 'आध्यात्मिक महत्त्व वाले राज्य',
      subtitle: 'क्षेत्रों को देखें और भूगोल व भक्ति से जुड़ी कथाएँ खोजें।',
    },
    cardsSection: {
      title: 'संपादक चयन',
      subtitle: 'कहानी, अनुष्ठान और संदर्भ के साथ चुनी हुई मंदिर कथाएँ।',
    },
    newlyAddedSection: {
      title: 'एटलस में नए मंदिर',
      subtitle: 'नवीनतम शोध के साथ दस्तावेज़ किए गए नए मंदिर।',
      seeAll: 'सभी हाल ही में जोड़े गए देखें',
      showLess: 'कम दिखाएं',
      tierLabels: { today: 'आज', thisWeek: 'इस सप्ताह', thisMonth: 'इस माह', earlier: 'पहले' },
    },
    searchSection: {
      title: 'खोज परिणाम',
      subtitle: (count) => `${count} मंदिर आपके फ़िल्टर से मिले।`,
    },
    searchEmpty: {
      title: 'चयनित फ़िल्टर से कोई परिणाम नहीं मिला।',
      body: 'अधिक मंदिर देखने के लिए फ़िल्टर या खोज शब्द हटाएँ।',
    },
    highlightLabel: 'मुख्य आकर्षण',
    readFullStory: 'कथा पढ़ें',
    emptyState: {
      title: 'और मंदिर कथाएँ जल्द जोड़ी जाएंगी।',
      body:
        'हम राज्यवार कवरेज बढ़ा रहे हैं। किसी अन्य क्षेत्र का चयन करें या अगला मंदिर सुझाएँ।',
      cta: 'मंदिर सुझाएँ',
    },
    featuresSection: {
      title: 'तीर्थयात्रियों और साधकों के लिए',
      subtitle: 'कालातीत यात्राओं के लिए आधुनिक अनुभव।',
      items: [
        {
          title: 'राज्य से शहर खोज',
          text: 'राज्यवार भारत देखें, शहर चुनें और आध्यात्मिक विरासत को स्पष्टता से खोजें।',
        },
        {
          title: 'जीवंत मंदिर कथाएँ',
          text: 'अनुष्ठानों, क्षेत्रीय परंपराओं और सांस्कृतिक संदर्भ पर केंद्रित संक्षिप्त कथन।',
        },
        {
          title: 'यात्रा मार्गदर्शन',
          text: 'मुख्य आकर्षण, सर्वोत्तम समय और वातावरण संबंधी सुझाव।',
        },
      ],
    },
    aboutSection: {
      eyebrow: 'परिचय',
      title: 'जय भोलेनाथ भारत की पवित्र भूगोल यात्रा का जीवंत संग्रह है।',
      subtitle:
        'हम मंदिर कथाएँ, परंपराएँ और यात्रा मार्ग सावधानी से संकलित करते हैं ताकि साधक सम्मान और स्पष्टता के साथ खोज कर सकें।',
      cards: [
        {
          title: 'हमारा उद्देश्य',
          body: 'एक सम्मानजनक, गैर-व्यावसायिक पोर्टल बनाना जो मंदिर की कथा, अनुष्ठान और स्थानीय संदर्भ को जीवित रखे।',
        },
        {
          title: 'हम क्या चुनते हैं',
          body: 'मंदिर कथाएँ, प्रमुख अनुष्ठान, सर्वोत्तम समय और सार्वजनिक अभिलेखों से सत्यापित चित्र।',
        },
        {
          title: 'इसे कैसे उपयोग करें',
          body: 'राज्य चुनें, कथा पढ़ें और स्थानीय परंपराओं के साथ अपनी यात्रा का सम्मानपूर्वक नियोजन करें।',
        },
      ],
    },
    disclaimerSection: {
      title: 'अस्वीकरण',
      body:
        'यहाँ दी गई जानकारी सार्वजनिक स्रोतों और समुदाय इनपुट से संकलित है। स्थानीय परंपराओं और मंदिर प्रशासन के अनुसार विवरण बदल सकते हैं। कृपया यात्रा से पहले आधिकारिक स्रोतों से समय, अनुष्ठान और प्रवेश नियम सत्यापित करें।',
      note: 'यदि कोई त्रुटि दिखे तो सुधार साझा करें ताकि हम अपडेट कर सकें।',
    },
    recentSection: {
      title: 'हाल की शैव खोजें',
      subtitle:
        'हाल में रिपोर्ट हुई या पुनः खोजी गई शिव स्थलों की झलक। कुछ विवरण अभी सत्यापन में हैं।',
      emptyTitle: 'और खोजें जल्द जोड़ी जाएंगी।',
      emptyBody: 'सत्यापन के साथ नई खोजें जोड़ी जाती रहेंगी।',
      shaktiOnlyTitle: 'केवल शिव मोड में उपलब्ध',
      shaktiOnlyBody: 'यह अनुभाग शैव खोजों के लिए है। शिव मोड में देखें।',
      note:
        'यह प्रविष्टियाँ हाल की रिपोर्टों का सार हैं; अनुष्ठान, प्रवेश और कालक्रम पर अतिरिक्त शोध चल रहा हो सकता है।',
      pending: 'विवरण अपडेट होना बाकी',
      labels: {
        period: 'अनुमानित काल',
        source: 'स्रोत',
        status: 'स्थिति',
      },
    },
    modeToggle: {
      label: 'केंद्र',
      shiva: 'शिव मोड',
      shakti: 'शक्ति मोड',
    },
    modal: {
      eyebrow: 'मंदिर कथा',
      close: 'बंद करें',
      story: 'कथा',
      signature: 'विशेष क्षण',
      coreDetails: 'मुख्य विवरण',
      rituals: 'अनुष्ठान',
      festivals: 'त्योहार',
      more: 'अधिक विवरण',
      sources: 'स्रोत',
      puranicSources: 'पौराणिक स्रोत',
      folkloreSources: 'लोककथाएँ स्रोत',
      empty:
        'हम सत्यापित इतिहास, त्योहार कैलेंडर और उपयोगी यात्रा नोट्स जोड़ रहे हैं। आपके पास स्रोत हों तो साझा करें।',
      report: 'सुधार सुझाएं',
      reportNote: 'कोई त्रुटि या अधूरी जानकारी दिखी?',
      share: 'साझा करें',
      copied: 'कॉपी हो गया!',
      save: 'सहेजें',
      saved: 'सहेजा',
      similarTitle: 'आगे अन्वेषण करें',
      visited: 'दर्शन किया',
      markVisited: 'दर्शन चिह्नित करें',
    },
    circuitsTitle: 'तीर्थयात्रा परिपथ',
    circuitsSubtitle: 'पवित्र परिपथों में अपनी यात्रा ट्रैक करें।',
    circuitsProgress: (done, total) => `${total} में से ${done}`,
    mapTitle: 'क्षेत्र के अनुसार खोजें',
    mapSubtitle: 'भूगोल के अनुसार भारत के पवित्र मंदिरों का अन्वेषण करें।',
    templeCount: (n) => `${n} मंदिर`,
    cal: {
      todayLabel: 'आज',
    },
    details: {
      deity: 'देवता',
      tradition: 'संप्रदाय',
      bestTime: 'सर्वश्रेष्ठ समय',
      timings: 'समय',
      dressCode: 'ड्रेस कोड',
      entryNotes: 'प्रवेश नोट्स',
    },
    moreLabels: {
      history: 'इतिहास',
      puranic: 'पौराणिक दृष्टि',
      folklore: 'लोककथा',
      architecture: 'वास्तुकला',
      darshan: 'दर्शन और आरती',
      seasonal: 'मौसमी जानकारी',
      visitorNotes: 'आगंतुक नोट्स',
      festivals: 'त्योहार',
    },
    language: {
      label: 'भाषा',
      en: 'English',
      hi: 'हिंदी',
    },
  },
}

function buildReportMailto(temple, email) {
  const subject = `[Data Issue] ${temple.name} — ${temple.city}, ${temple.state}`
  const body = [
    `Temple: ${temple.name}`,
    `Location: ${temple.city}, ${temple.state}`,
    ``,
    `Issue type (tick one):`,
    `[ ] Incorrect information`,
    `[ ] Missing information`,
    `[ ] Wrong image or credit`,
    `[ ] Wrong timings / access details`,
    `[ ] Other`,
    ``,
    `Description:`,
    `(please describe the issue here)`,
  ].join('\n')
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function App() {
  const [language, _setLanguage] = useState('en')
  const [activePage, setActivePage] = useState(() =>
    typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : DEFAULT_PAGE
  )
  const [selectedState, setSelectedState] = useState(ALL_STATES)
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [editorJourneyFilter, setEditorJourneyFilter] = useState('')
  const [stateFilterSource, setStateFilterSource] = useState('dropdown')
  const [mode, _setMode] = useState(MODES.SHIVA)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchPage, setSearchPage] = useState(1)
  const [recentPage, setRecentPage] = useState(1)
  const [newlyAddedPage, setNewlyAddedPage] = useState(1)
  const [activeTemple, setActiveTemple] = useState(null)
  const [savedTemples, setSavedTemples] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jbn-saved') || '[]') } catch { return [] }
  })
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [showAllNewlyAdded, setShowAllNewlyAdded] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [visitedTemples, setVisitedTemples] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jbn-visited') || '[]') } catch { return [] }
  })
  const [activeRegion, setActiveRegion] = useState('north')
  const [calBannerExpanded, setCalBannerExpanded] = useState(false)
  const storyModalRef = useRef(null)
  const storyCloseButtonRef = useRef(null)
  const lastFocusedElementRef = useRef(null)
  const touchStartYRef = useRef(0)
  const swipeDyRef = useRef(0)
  const hasTrackedInitialPage = useRef(false)
  const safeTempleDataRef = useRef([])
  const deeplinkHandled = useRef(false)
  const [modalImageSrc, setModalImageSrc] = useState('')
  const [isPortraitImage, setIsPortraitImage] = useState(false)
  const [auditStatus, setAuditStatus] = useState({ running: false, total: 0, done: 0 })
  const [localTempleData, setLocalTempleData] = useState({
    shiva: [],
    shakti: [],
    andhra: [],
    loading: false,
    loaded: false,
    error: '',
  })
  const [apiStatus, setApiStatus] = useState({ loading: false, error: '' })
  const [apiStates, setApiStates] = useState([])
  const [apiCities, setApiCities] = useState([])
  const [apiStats, setApiStats] = useState({ temples: 0, states: 0, cities: 0, sources: 0 })
  const [apiEditorData, setApiEditorData] = useState({ items: [], total: 0, loading: false })
  const [apiSearchData, setApiSearchData] = useState({ items: [], total: 0, loading: false })
  const [apiNewlyAddedData, setApiNewlyAddedData] = useState({ items: [], total: 0, loading: false })
  const t = copy[language]
  const isAbout = activePage === 'about'
  const isRecent = activePage === 'recent'
  const isCircuits = activePage === 'circuits'
  const isMap = activePage === 'map'
  const isShivaMode = mode === MODES.SHIVA
  const modeKey = isShivaMode ? MODES.SHIVA : MODES.SHAKTI
  const useServerData = API_MODE_ENABLED && !apiStatus.error
  const shouldLoadLocalData = !API_MODE_ENABLED || Boolean(apiStatus.error)

  useEffect(() => {
    if (!shouldLoadLocalData || localTempleData.loaded) {
      return
    }

    let active = true
    setLocalTempleData((prev) =>
      prev.loading ? prev : { ...prev, loading: true, error: '' }
    )

    loadLocalTempleModules()
      .then((payload) => {
        if (!active) return
        setLocalTempleData({
          shiva: payload.shiva,
          shakti: payload.shakti,
          andhra: payload.andhra,
          loading: false,
          loaded: true,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setLocalTempleData((prev) => ({
          ...prev,
          loading: false,
          error: String(error?.message || 'Failed to load local temple data'),
        }))
      })

    return () => {
      active = false
    }
  }, [shouldLoadLocalData, localTempleData.loaded])

  const shivaTempleData = localTempleData.shiva
  const shaktiTempleData = localTempleData.shakti
  const andhraTempleData = localTempleData.andhra

  const shaktiStates = useMemo(() => {
    const seen = new Set()
    const list = []
    shaktiTempleData.forEach((temple) => {
      if (!temple || typeof temple !== 'object') return
      if (!temple.state || seen.has(temple.state)) return
      seen.add(temple.state)
      list.push(temple.state)
    })
    return list
  }, [shaktiTempleData])
  const shivaStates = useMemo(() => {
    const present = new Set(
      shivaTempleData
        .map((temple) => temple?.state)
        .filter(Boolean)
    )
    const prioritized = FOCUS_STATES.filter((state) => present.has(state))
    const remaining = Array.from(present)
      .filter((state) => !FOCUS_STATES.includes(state))
      .sort((a, b) => a.localeCompare(b))
    return [...prioritized, ...remaining]
  }, [shivaTempleData])
  const activeStates = useMemo(() => {
    if (isShivaMode) {
      if (useServerData) {
        return apiStates
      }
      return shivaStates
    }
    if (useServerData) {
      return apiStates
    }
    return shaktiStates
  }, [isShivaMode, useServerData, apiStates, shaktiStates, shivaStates])
  const staticTempleData = useMemo(() => {
    if (!isShivaMode) {
      return shaktiTempleData
    }
    if (
      selectedState !== ALL_STATES &&
      selectedState === 'Andhra Pradesh' &&
      andhraTempleData.length
    ) {
      return andhraTempleData
    }
    return shivaTempleData
  }, [isShivaMode, selectedState, shaktiTempleData, andhraTempleData, shivaTempleData])
  const baseTempleData = staticTempleData
  const safeTempleData = useMemo(
    () => baseTempleData.filter((item) => item && typeof item === 'object'),
    [baseTempleData]
  )

  const themedTemples = safeTempleData

  const todayContext = useMemo(() => getTodayContext(safeTempleData), [safeTempleData])

  const recentItems = useMemo(
    () => (isShivaMode ? recentDiscoveries : []),
    [isShivaMode]
  )

  const visibleTemples = useMemo(() => {
    const base = themedTemples.filter((item) => activeStates.includes(item.state))
    if (showSavedOnly)
      return base.filter((t) => savedTemples.includes(slugify(`${t.name}-${t.city}-${t.state}`)))
    return base
  }, [themedTemples, activeStates, showSavedOnly, savedTemples])

  const states = useMemo(() => [ALL_STATES, ...activeStates], [activeStates])

  const statTemples = useMemo(() => visibleTemples, [visibleTemples])

  const similarTemples = useMemo(() => {
    if (!activeTemple || !safeTempleData.length) return []
    const activeTags = new Set(Array.isArray(activeTemple.tags) ? activeTemple.tags : [])
    return safeTempleData
      .filter((t) => t.name !== activeTemple.name)
      .map((t) => {
        const tTags = Array.isArray(t.tags) ? t.tags : []
        const shared = tTags.filter((tag) => activeTags.has(tag)).length
        const sameState = t.state === activeTemple.state ? 1 : 0
        const sameTradition = t.tradition === activeTemple.tradition ? 1 : 0
        return { t, score: shared * 3 + sameState + sameTradition }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ t }) => t)
  }, [activeTemple, safeTempleData])

  const searchSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (q.length < 2) return []
    return safeTempleData
      .filter((t) => {
        const name = (getTempleText(t, 'name') || '').toLowerCase()
        const city = (t.city || '').toLowerCase()
        return name.includes(q) || city.includes(q)
      })
      .slice(0, 6)
  }, [searchTerm, safeTempleData])

  const templeStats = useMemo(() => {
    if (useServerData && apiStats.temples) {
      return {
        temples: apiStats.temples,
        cities: apiStats.cities,
        states: apiStats.states,
      }
    }
    const statesSet = new Set(statTemples.map((item) => item.state))
    const citiesSet = new Set(statTemples.map((item) => item.city))
    return {
      temples: statTemples.length,
      cities: citiesSet.size,
      states: statesSet.size,
    }
  }, [statTemples, useServerData, apiStats])

  const sourcedTemplesCount = useMemo(
    () => {
      if (useServerData && Number.isFinite(apiStats.sources)) {
        return apiStats.sources
      }
      return statTemples.filter((item) => {
        const details = item?.moreDetails
        if (!details) return false
        return Boolean(
          details.sources?.length || details.puranicSources?.length || details.folkloreSources?.length
        )
      }).length
    },
    [statTemples, useServerData, apiStats]
  )

  const cities = useMemo(() => {
    if (useServerData) {
      const sorted = [...apiCities].sort((a, b) =>
        a.localeCompare(b, language === 'hi' ? 'hi-IN' : 'en-IN')
      )
      return [ALL_CITIES, ...sorted]
    }
    const pool =
      selectedState === ALL_STATES
        ? visibleTemples
        : visibleTemples.filter((item) => item.state === selectedState)
    const unique = Array.from(new Set(pool.map((item) => item.city).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, language === 'hi' ? 'hi-IN' : 'en-IN')
    )
    return [ALL_CITIES, ...unique]
  }, [selectedState, visibleTemples, language, useServerData, apiCities])

  useEffect(() => {
    if (!cities.includes(selectedCity)) {
      setSelectedCity(ALL_CITIES)
    }
  }, [cities, selectedCity])

  useEffect(() => {
    if (!states.includes(selectedState)) {
      setSelectedState(ALL_STATES)
    }
  }, [states, selectedState])

  useEffect(() => {
    if (useServerData) {
      return
    }
    if (activeTemple && !visibleTemples.includes(activeTemple)) {
      setActiveTemple(null)
    }
  }, [activeTemple, visibleTemples, useServerData])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedState, mode])

  useEffect(() => {
    setRecentPage(1)
  }, [mode])

  useEffect(() => {
    setSearchPage(1)
  }, [selectedState, selectedCity, searchTerm, mode])

  useEffect(() => {
    setNewlyAddedPage(1)
  }, [mode])

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  useEffect(() => {
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true
      return
    }
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }
    const pagePath = PAGE_TRACKING_PATHS[activePage] || PAGE_TRACKING_PATHS.temples
    const pageTitle = PAGE_TRACKING_TITLES[activePage] || PAGE_TRACKING_TITLES.temples
    window.gtag('event', 'page_view', {
      page_title: `Jai Bhole Nath - ${pageTitle}`,
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
    })
  }, [activePage])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handlePopState = () => {
      const path = normalizeRoutePath(window.location.pathname)
      setActivePage(resolvePageFromPath(path))
      if (path.startsWith('/temple/')) {
        const slug = path.replace(/^\/temple\//, '')
        const match = safeTempleDataRef.current.find(
          (t) => slugify(`${t.name}-${t.city}-${t.state}`) === slug
        )
        if (match) { setActiveTemple(match); return }
      }
      setActiveTemple(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Keep safeTempleDataRef current for the popstate handler (avoids stale closure)
  useEffect(() => { safeTempleDataRef.current = safeTempleData }, [safeTempleData])

  // Persist saved temples to localStorage
  useEffect(() => {
    try { localStorage.setItem('jbn-saved', JSON.stringify(savedTemples)) } catch {}
  }, [savedTemples])

  // Persist visited temples to localStorage
  useEffect(() => {
    try { localStorage.setItem('jbn-visited', JSON.stringify(visitedTemples)) } catch {}
  }, [visitedTemples])

  // Sync URL when modal opens/closes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeTemple) {
      const slug = slugify(`${activeTemple.name}-${activeTemple.city}-${activeTemple.state}`)
      const targetPath = `/temple/${slug}`
      if (normalizeRoutePath(window.location.pathname) !== targetPath)
        window.history.pushState({ page: activePage, templeSlug: slug }, '', targetPath)
    } else {
      if (normalizeRoutePath(window.location.pathname).startsWith('/temple/')) {
        const pagePath = PAGE_TRACKING_PATHS[activePage] || PAGE_TRACKING_PATHS[DEFAULT_PAGE]
        window.history.replaceState({ page: activePage }, '', pagePath)
      }
    }
  }, [activeTemple, activePage])

  // Auto-open temple from deep-link URL on initial load
  useEffect(() => {
    if (!safeTempleData.length || deeplinkHandled.current) return
    const path = typeof window !== 'undefined' ? normalizeRoutePath(window.location.pathname) : '/'
    if (!path.startsWith('/temple/')) { deeplinkHandled.current = true; return }
    const slug = path.replace(/^\/temple\//, '')
    const match = safeTempleData.find((t) => slugify(`${t.name}-${t.city}-${t.state}`) === slug)
    deeplinkHandled.current = true
    if (match) openTempleStory(match, 'deeplink')
  }, [safeTempleData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update document.title, OG meta, Twitter meta and canonical when modal opens/closes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const setMeta = (attr, val, content) =>
      document.querySelector(`meta[${attr}="${val}"]`)?.setAttribute('content', content)
    const canonical = document.getElementById('canonical')
    if (activeTemple) {
      const slug = slugify(`${activeTemple.name}-${activeTemple.city}-${activeTemple.state}`)
      const templeUrl = `${window.location.origin}/temple/${slug}`
      document.title = `${activeTemple.name} — Jai Bhole Nath`
      setMeta('property', 'og:title', `${activeTemple.name} — Jai Bhole Nath`)
      setMeta('property', 'og:description', `${activeTemple.city}, ${activeTemple.state}`)
      setMeta('property', 'og:url', templeUrl)
      if (activeTemple.image) setMeta('property', 'og:image', activeTemple.image)
      setMeta('name', 'twitter:title', `${activeTemple.name} — Jai Bhole Nath`)
      setMeta('name', 'twitter:description', `${activeTemple.city}, ${activeTemple.state}`)
      if (activeTemple.image) setMeta('name', 'twitter:image', activeTemple.image)
      if (canonical) canonical.setAttribute('href', templeUrl)
    } else {
      document.title = 'Jai Bhole Nath'
      setMeta('property', 'og:title', 'Jai Bhole Nath — Sacred Temples of India')
      setMeta('property', 'og:description', 'Discover sacred Shiva and Shakti temples across India.')
      setMeta('property', 'og:url', window.location.origin)
      setMeta('property', 'og:image', `${window.location.origin}/og-image.png`)
      setMeta('name', 'twitter:title', 'Jai Bhole Nath — Sacred Temples of India')
      setMeta('name', 'twitter:description', 'Discover sacred Shiva and Shakti temples across India.')
      setMeta('name', 'twitter:image', `${window.location.origin}/og-image.png`)
      if (canonical) canonical.setAttribute('href', window.location.origin)
    }
  }, [activeTemple])

  useEffect(() => {
    if (!activeTemple) {
      return undefined
    }

    if (typeof document !== 'undefined') {
      lastFocusedElementRef.current = document.activeElement
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveTemple(null)
        return
      }
      if (event.key !== 'Tab' || !storyModalRef.current) {
        return
      }

      const focusableElements = Array.from(
        storyModalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          element instanceof HTMLElement && element.getAttribute('aria-hidden') !== 'true'
      )

      if (!focusableElements.length) {
        event.preventDefault()
        storyModalRef.current.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === firstElement || !storyModalRef.current.contains(activeElement)) {
          event.preventDefault()
          lastElement.focus()
        }
        return
      }

      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => {
      storyCloseButtonRef.current?.focus()
    })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      const previousFocus = lastFocusedElementRef.current
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus()
      }
      lastFocusedElementRef.current = null
    }
  }, [activeTemple])

  useEffect(() => {
    if (activeTemple && storyModalRef.current) {
      storyModalRef.current.scrollTop = 0
    }
  }, [activeTemple])

  useEffect(() => {
    if (!activeTemple) {
      setModalImageSrc('')
      setIsPortraitImage(false)
      return
    }
    const imageSrc = activeTemple.image || getPlaceholderImage(activeTemple.name)
    setModalImageSrc(imageSrc)
    const probe = new Image()
    probe.onload = () => {
      setIsPortraitImage(probe.naturalHeight > probe.naturalWidth)
    }
    probe.onerror = () => {
      setIsPortraitImage(false)
    }
    probe.src = imageSrc
  }, [activeTemple])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const searchActive =
    (stateFilterSource === 'dropdown' && selectedState !== ALL_STATES) ||
    selectedCity !== ALL_CITIES ||
    normalizedSearch.length > 0 ||
    editorJourneyFilter !== ''

  useEffect(() => {
    if (!API_MODE_ENABLED) {
      return undefined
    }

    const controller = new AbortController()
    setApiStatus({ loading: true, error: '' })

    const query = buildApiQuery({ mode: modeKey })
    fetchTempleApiJson(`/api/stats?${query}`, controller.signal)
      .then((payload) => {
        const total = Number(payload?.total) || 0
        if (total === 0) {
          setApiStatus({
            loading: false,
            error: 'Temple API returned 0 records. Run `npm run store:export` and restart `npm run dev:api`.',
          })
          return
        }
        setApiStats({
          temples: total,
          states: Number(payload?.states) || 0,
          cities: Number(payload?.cities) || 0,
          sources: Number(payload?.sourced) || 0,
        })
        setApiStatus({ loading: false, error: '' })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setApiStatus({
          loading: false,
          error: String(error?.message || 'Temple API unavailable'),
        })
      })

    return () => controller.abort()
  }, [modeKey])

  useEffect(() => {
    if (!useServerData) {
      return undefined
    }

    const controller = new AbortController()
    const statesQuery = buildApiQuery({
      mode: modeKey,
    })
    const citiesQuery = buildApiQuery({
      mode: modeKey,
      state: selectedState === ALL_STATES ? '' : selectedState,
    })

    Promise.all([
      fetchTempleApiJson(`/api/facets?${statesQuery}`, controller.signal),
      fetchTempleApiJson(`/api/facets?${citiesQuery}`, controller.signal),
    ])
      .then(([statesPayload, citiesPayload]) => {
        const stateList = Array.isArray(statesPayload?.states) ? statesPayload.states : []
        const cityList = Array.isArray(citiesPayload?.cities) ? citiesPayload.cities : []
        setApiStates(stateList)
        setApiCities(cityList)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setApiStatus((prev) => ({
          ...prev,
          error: String(error?.message || 'Temple API unavailable'),
        }))
      })
    return () => controller.abort()
  }, [useServerData, modeKey, selectedState])

  useEffect(() => {
    if (!useServerData) {
      return undefined
    }

    const controller = new AbortController()
    setApiEditorData((prev) => ({ ...prev, loading: true }))
    const query = buildApiQuery({
      mode: modeKey,
      state: selectedState === ALL_STATES ? '' : selectedState,
      journey: editorJourneyFilter,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
      sort: 'name_asc',
    })

    fetchTempleApiJson(`/api/temples?${query}`, controller.signal)
      .then((payload) => {
        setApiEditorData({
          items: Array.isArray(payload?.items) ? payload.items : [],
          total: Number(payload?.total) || 0,
          loading: false,
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setApiEditorData((prev) => ({ ...prev, loading: false }))
        setApiStatus((prev) => ({
          ...prev,
          error: String(error?.message || 'Temple API unavailable'),
        }))
      })

    return () => controller.abort()
  }, [useServerData, modeKey, selectedState, editorJourneyFilter, currentPage])

  useEffect(() => {
    if (!useServerData || !searchActive) {
      setApiSearchData((prev) =>
        prev.items.length || prev.total
          ? { items: [], total: 0, loading: false }
          : prev
      )
      return undefined
    }

    const controller = new AbortController()
    setApiSearchData((prev) => ({ ...prev, loading: true }))
    const query = buildApiQuery({
      mode: modeKey,
      state: selectedState === ALL_STATES ? '' : selectedState,
      city: selectedCity === ALL_CITIES ? '' : selectedCity,
      search: normalizedSearch,
      limit: SEARCH_PAGE_SIZE,
      offset: (searchPage - 1) * SEARCH_PAGE_SIZE,
      sort: 'name_asc',
    })

    fetchTempleApiJson(`/api/temples?${query}`, controller.signal)
      .then((payload) => {
        setApiSearchData({
          items: Array.isArray(payload?.items) ? payload.items : [],
          total: Number(payload?.total) || 0,
          loading: false,
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setApiSearchData((prev) => ({ ...prev, loading: false }))
        setApiStatus((prev) => ({
          ...prev,
          error: String(error?.message || 'Temple API unavailable'),
        }))
      })

    return () => controller.abort()
  }, [
    useServerData,
    searchActive,
    modeKey,
    selectedState,
    selectedCity,
    normalizedSearch,
    searchPage,
  ])

  useEffect(() => {
    if (!useServerData) {
      return undefined
    }

    const controller = new AbortController()
    setApiNewlyAddedData((prev) => ({ ...prev, loading: true }))
    const query = buildApiQuery({
      mode: modeKey,
      state: '',
      limit: NEWLY_ADDED_LIMIT,
      offset: 0,
      sort: 'addedat_desc',
    })

    fetchTempleApiJson(`/api/temples?${query}`, controller.signal)
      .then((payload) => {
        setApiNewlyAddedData({
          items: Array.isArray(payload?.items) ? payload.items : [],
          total: Number(payload?.total) || 0,
          loading: false,
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setApiNewlyAddedData((prev) => ({ ...prev, loading: false }))
        setApiStatus((prev) => ({
          ...prev,
          error: String(error?.message || 'Temple API unavailable'),
        }))
      })

    return () => controller.abort()
  }, [useServerData, modeKey])

  const templeMatchesTerm = (item, term) => {
    if (!term) return true
    return [
      item.name,
      item.city,
      item.state,
      item.region,
      item.deity,
      item.tradition,
      item.story,
      item.storyHi,
      item.highlight,
      item.highlightHi,
      ...(item.tags ?? []),
      ...(item.tagsHi ?? []),
      ...(item.rituals ?? []),
      ...(item.ritualsHi ?? []),
      ...(item.festivals ?? []),
      ...(item.festivalsHi ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  }

  const isCanonicalJyotirlingaTemple = (item) => {
    const hasTag = Array.isArray(item?.tags) && item.tags.some(
      (t) => normalizeTempleKey(t) === 'jyotirlinga'
    )
    if (!hasTag) return false
    const locationKey = `${normalizeTempleKey(item?.state)}|${normalizeTempleKey(item?.city)}`
    return CANONICAL_JYOTIRLINGA_LOCATIONS.has(locationKey)
  }

  const matchesEditorJourney = (item, term) => {
    if (!term) return true
    if (term === 'jyotirlinga') {
      return isCanonicalJyotirlingaTemple(item)
    }
    return templeMatchesTerm(item, term)
  }

  const searchFilteredTemples = visibleTemples.filter((item) => {
    const matchState = selectedState === ALL_STATES || item.state === selectedState
    const matchCity = selectedCity === ALL_CITIES || item.city === selectedCity
    const matchSearch = normalizedSearch
      ? [
          item.name,
          item.city,
          item.state,
          item.region,
          item.deity,
          item.tradition,
          item.story,
          item.storyHi,
          item.highlight,
          item.highlightHi,
          ...(item.tags ?? []),
          ...(item.tagsHi ?? []),
          ...(item.rituals ?? []),
          ...(item.ritualsHi ?? []),
          ...(item.festivals ?? []),
          ...(item.festivalsHi ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      : true
    const matchTag = editorJourneyFilter ? matchesEditorJourney(item, editorJourneyFilter) : true
    return matchState && matchCity && matchSearch && matchTag
  })

  const storyTemples = visibleTemples.filter(
    (item) => selectedState === ALL_STATES || item.state === selectedState
  )
  const parseAddedAt = (value) => {
    const ts = Date.parse(String(value || ''))
    return Number.isFinite(ts) ? ts : 0
  }
  const clampAddedAt = (value, nowTs = Date.now()) => {
    const ts = parseAddedAt(value)
    if (!ts) return 0
    return ts > nowTs ? nowTs : ts
  }
  const compareAddedAtDesc = (a, b, nowTs = Date.now()) => {
    const diff = clampAddedAt(b?.addedAt, nowTs) - clampAddedAt(a?.addedAt, nowTs)
    if (diff !== 0) return diff
    return String(a?.name || '').localeCompare(String(b?.name || ''))
  }
  const getRelativeAddedAt = (value, refNow = Date.now()) => {
    const ts = clampAddedAt(value, refNow)
    if (!ts) return language === 'hi' ? 'हाल ही में' : 'Recently'
    const diffDays = (refNow - ts) / 86400000
    if (language === 'hi') {
      if (diffDays < 1) return 'आज'
      if (diffDays < 2) return 'कल'
      if (diffDays < 7) return `${Math.floor(diffDays)} दिन पहले`
      if (diffDays < 14) return 'पिछले सप्ताह'
      if (diffDays < 31) return `${Math.floor(diffDays / 7)} सप्ताह पहले`
      return new Intl.DateTimeFormat('hi-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }).format(new Date(ts))
    }
    if (diffDays < 1) return 'Today'
    if (diffDays < 2) return 'Yesterday'
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`
    if (diffDays < 14) return 'Last week'
    if (diffDays < 31) return `${Math.floor(diffDays / 7)} weeks ago`
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }).format(new Date(ts))
  }

  const getNewlyAddedTier = (value, refNow = Date.now()) => {
    const ts = clampAddedAt(value, refNow)
    if (!ts) return 'earlier'
    const diffDays = (refNow - ts) / 86400000
    if (diffDays < 1) return 'today'
    if (diffDays < 7) return 'thisWeek'
    if (diffDays < 31) return 'thisMonth'
    return 'earlier'
  }
  const nowTs = Date.now()
  const newlyAddedTemples = [...visibleTemples]
    .filter((item) => item.addedAt)
    .sort((a, b) => compareAddedAtDesc(a, b, nowTs))
    .slice(0, NEWLY_ADDED_LIMIT)
  const displayedTemples = editorJourneyFilter
    ? storyTemples.filter((item) => matchesEditorJourney(item, editorJourneyFilter))
    : storyTemples
  const effectiveDisplayedTemples = useServerData ? apiEditorData.items : displayedTemples
  const effectiveDisplayedTotal = useServerData ? apiEditorData.total : displayedTemples.length
  const effectiveSearchTemples = useServerData && searchActive ? apiSearchData.items : searchFilteredTemples
  const effectiveSearchTotal = useServerData && searchActive ? apiSearchData.total : searchFilteredTemples.length
  const effectiveNewlyAddedTemples = useServerData
    ? [...apiNewlyAddedData.items]
        .filter((item) => item?.addedAt)
        .sort((a, b) => compareAddedAtDesc(a, b, nowTs))
        .slice(0, NEWLY_ADDED_LIMIT)
    : newlyAddedTemples
  const featuredTemple = (() => {
    const pool = effectiveDisplayedTemples.slice(0, 6)
    if (!pool.length) return null
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    return pool[seed % pool.length]
  })()
  const apiBusy =
    apiStatus.loading ||
    apiEditorData.loading ||
    apiSearchData.loading ||
    apiNewlyAddedData.loading
  const apiStatusText = (() => {
    if (!API_MODE_ENABLED) return ''
    if (apiBusy) {
      return language === 'hi'
        ? 'API से मंदिर डेटा लोड किया जा रहा है...'
        : 'Loading temple data from API...'
    }
    if (apiStatus.error) {
      return language === 'hi'
        ? 'API उपलब्ध नहीं है; स्थानीय डेटा पर वापस आए।'
        : 'Temple API unavailable; using bundled dataset.'
    }
    return language === 'hi'
      ? `Temple API मोड सक्रिय (${templeStats.temples.toLocaleString()} रिकॉर्ड)`
      : `Temple API mode active (${templeStats.temples.toLocaleString()} records)`
  })()
  const modeLabel = isShivaMode ? t.modeToggle.shiva : t.modeToggle.shakti
  const storyStateLabel = selectedState === ALL_STATES ? t.labels.allStates : selectedState
  const heroJourneyItems = t.heroJourneys?.items ?? []
  const activeJourneyLabel =
    heroJourneyItems.find((item) => item.term === editorJourneyFilter)?.label ||
    CIRCUITS.find((c) => c.tag.toLowerCase() === editorJourneyFilter)?.name ||
    ''
  const featuredStoryImage = featuredTemple
    ? featuredTemple.image ?? getPlaceholderImage(featuredTemple.name)
    : ''
  const featuredStoryText = featuredTemple
    ? language === 'hi'
      ? featuredTemple.storyHi ?? featuredTemple.story ?? ''
      : featuredTemple.story ?? ''
    : ''
  const featuredStorySnippet = featuredStoryText
    ? `${featuredStoryText.split(/\s+/).slice(0, 24).join(' ')}${featuredStoryText.split(/\s+/).length > 24 ? '…' : ''}`
    : ''
  const featuredStoryHighlight = featuredTemple
    ? language === 'hi'
      ? featuredTemple.highlightHi ?? featuredTemple.highlight ?? ''
      : featuredTemple.highlight ?? ''
    : ''
  const featuredStoryTags = featuredTemple
    ? (
        language === 'hi'
          ? featuredTemple.tagsHi ?? featuredTemple.tags ?? []
          : featuredTemple.tags ?? []
      ).slice(0, 2)
    : []
  const featuredStoryCredit = featuredTemple?.credit || ''
  const featuredStoryCreditUrl = featuredTemple?.creditUrl || ''
  const totalPages = Math.max(1, Math.ceil(effectiveDisplayedTotal / PAGE_SIZE))
  const totalSearchPages = Math.max(1, Math.ceil(effectiveSearchTotal / SEARCH_PAGE_SIZE))
  const totalRecentPages = Math.max(
    1,
    Math.ceil(recentItems.length / RECENT_PAGE_SIZE)
  )
  const pagedTemples = useServerData
    ? effectiveDisplayedTemples
    : displayedTemples.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      )
  const pagedSearchTemples = useServerData && searchActive
    ? effectiveSearchTemples
    : searchFilteredTemples.slice(
        (searchPage - 1) * SEARCH_PAGE_SIZE,
        searchPage * SEARCH_PAGE_SIZE
      )
  const pagedRecentItems = recentItems.slice(
    (recentPage - 1) * RECENT_PAGE_SIZE,
    recentPage * RECENT_PAGE_SIZE
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (searchPage > totalSearchPages) {
      setSearchPage(totalSearchPages)
    }
  }, [searchPage, totalSearchPages])

  useEffect(() => {
    if (recentPage > totalRecentPages) {
      setRecentPage(totalRecentPages)
    }
  }, [recentPage, totalRecentPages])


  const getTempleId = (temple, index) => {
    if (!temple) return `temple-${index}`
    const base = slugify(`${temple.name}-${temple.city}-${temple.state}`)
    return base ? `temple-${base}` : `temple-${index}`
  }

  const featuredTempleId = featuredTemple ? getTempleId(featuredTemple, 0) : ''

  const scrollToTempleCard = (id) => {
    if (!id || typeof window === 'undefined') return
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToSection = (id) => {
    if (!id || typeof window === 'undefined') return
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const jumpToFeatured = () => {
    if (!featuredTempleId) return
    if (activePage !== 'temples') {
      switchPage('temples')
      window.setTimeout(() => scrollToTempleCard(featuredTempleId), 60)
      return
    }
    scrollToTempleCard(featuredTempleId)
  }

  const jumpToEditorsPicks = () => {
    scrollToSection('temple-cards')
    trackAnalyticsEvent('hero_cta_click', {
      cta_name: 'explore_editors_picks',
      active_page: activePage,
    })
  }

  const focusStateFilter = () => {
    if (typeof window === 'undefined') return
    const stateFilter = document.getElementById('filter-state')
    if (stateFilter) {
      stateFilter.scrollIntoView({ behavior: 'smooth', block: 'center' })
      stateFilter.focus()
    }
    trackAnalyticsEvent('hero_cta_click', {
      cta_name: 'browse_by_state',
      active_page: activePage,
    })
  }

  const applyHeroJourney = (item) => {
    if (!item?.term) return
    const nextTerm = editorJourneyFilter === item.term ? '' : item.term
    setEditorJourneyFilter(nextTerm)
    setCurrentPage(1)
    trackAnalyticsEvent('hero_journey_click', {
      journey_label: item.label,
      journey_term: nextTerm || item.term,
      journey_action: nextTerm ? 'apply' : 'clear',
      active_page: activePage,
    })
    if (nextTerm) {
      window.setTimeout(() => scrollToSection('temple-cards'), 70)
    }
  }

  const runImageAudit = async () => {
    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    if (!isDev) return
    if (selectedState === ALL_STATES) return
    if (auditStatus.running) return

    const fileNameFromSpecialPath = (url) => {
      const marker = '/Special:FilePath/'
      const idx = String(url || '').indexOf(marker)
      if (idx === -1) return ''
      return decodeURIComponent(String(url).slice(idx + marker.length))
    }

    const isSuspiciousImage = (temple) => {
      const file = fileNameFromSpecialPath(temple?.image).toLowerCase()
      if (!file) return false
      if (file.includes('temple') || file.includes('gopuram') || file.includes('mandir')) return false
      return [
        'bridge',
        'river',
        'canyon',
        'fort',
        'hills',
        'lake',
        'beach',
        'waterfall',
        'falls',
        'view',
        'map',
        'logo',
        'seal',
        'flag',
      ].some((hint) => file.includes(hint))
    }

    const probeImage = (src, timeoutMs = 9000) =>
      new Promise((resolve) => {
        if (!src) {
          resolve({ ok: false, reason: 'missing' })
          return
        }
        let finished = false
        const img = new Image()
        const timer = window.setTimeout(() => {
          if (finished) return
          finished = true
          resolve({ ok: false, reason: 'timeout' })
        }, timeoutMs)
        img.onload = () => {
          if (finished) return
          finished = true
          window.clearTimeout(timer)
          resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
          if (finished) return
          finished = true
          window.clearTimeout(timer)
          resolve({ ok: false, reason: 'error' })
        }
        img.src = src
      })

    const temples = safeTempleData.filter((temple) => temple?.state === selectedState)
    setAuditStatus({ running: true, total: temples.length, done: 0 })

    const results = []
    const queue = temples.slice()
    const workers = 4

    const worker = async () => {
      while (queue.length) {
        const temple = queue.shift()
        if (!temple) continue

        const imageValue = String(temple?.image || '').trim()
        const usesDefaultImage = placeholderImages.includes(imageValue)
        const suspect = isSuspiciousImage(temple)
        const probe = await probeImage(temple.image)
        const needsReview = usesDefaultImage || suspect || !probe.ok
        if (needsReview) {
          const query = `${String(temple.name || '')
            .replace(/[()]/g, '')
            .trim()} ${String(temple.city || '').trim()} temple`
          const status = !probe.ok
            ? `broken:${probe.reason}`
            : usesDefaultImage
              ? 'default:image'
              : 'suspicious'

          try {
            const candidates = await searchCommonsImages(query, 10)
            const best = pickBestCommonsImage(candidates, { name: temple.name, city: temple.city })
            results.push({
              name: temple.name,
              city: temple.city,
              oldImage: temple.image || '',
              status,
              query,
              suggestedImage: best?.imageUrl || '',
              suggestedCreditUrl: best?.filePageUrl || '',
              license: best?.license || '',
              suggestedTitle: best?.title || '',
            })
          } catch (error) {
            results.push({
              name: temple.name,
              city: temple.city,
              oldImage: temple.image || '',
              status,
              query,
              error: String(error?.message || error),
            })
          }
        }

        setAuditStatus((prev) => ({
          running: true,
          total: prev.total,
          done: Math.min(prev.total, prev.done + 1),
        }))
      }
    }

    await Promise.all(Array.from({ length: workers }, () => worker()))

    console.log('TEMPLE_IMAGE_AUDIT_RESULTS', {
      state: selectedState,
      count: results.length,
      results,
    })
    try {
      await navigator.clipboard.writeText(JSON.stringify({ state: selectedState, results }, null, 2))
    } catch {
      // Ignore clipboard failures (permissions / non-secure context).
    }
    setAuditStatus({ running: false, total: temples.length, done: temples.length })
  }

  const switchPage = (page) => {
    const nextPage = PAGE_TRACKING_PATHS[page] ? page : DEFAULT_PAGE
    setActivePage(nextPage)
    setActiveTemple(null)
    if (typeof window !== 'undefined') {
      const nextPath = PAGE_TRACKING_PATHS[nextPage] || PAGE_TRACKING_PATHS[DEFAULT_PAGE]
      const currentPath = normalizeRoutePath(window.location.pathname)
      if (currentPath !== nextPath) {
        window.history.pushState({ page: nextPage }, '', nextPath)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const trackAnalyticsEvent = (eventName, params = {}) => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }
    window.gtag('event', eventName, params)
  }

  const handleStateChange = (nextState, source = 'dropdown') => {
    setSelectedState(nextState)
    setStateFilterSource(source)
    trackAnalyticsEvent('filter_state_change', {
      filter_state: nextState,
      filter_source: source,
      active_page: activePage,
    })
  }

  const handleCityChange = (nextCity) => {
    setSelectedCity(nextCity)
    trackAnalyticsEvent('filter_city_change', {
      filter_city: nextCity,
      active_page: activePage,
    })
  }

  const clearFilters = () => {
    handleStateChange(ALL_STATES, 'dropdown')
    handleCityChange(ALL_CITIES)
    setEditorJourneyFilter('')
    setSearchTerm('')
    setShowSavedOnly(false)
    setCurrentPage(1)
    setSearchPage(1)
    setNewlyAddedPage(1)
    trackAnalyticsEvent('filters_cleared', {
      active_page: activePage,
    })
  }

  const handlePageChange = (nextPage, currentPageValue, onPage, context) => {
    if (nextPage === currentPageValue) return
    onPage(nextPage)
    trackAnalyticsEvent('pagination_click', {
      pagination_context: context,
      page_number: nextPage,
      active_page: activePage,
    })
  }

  const openTempleStory = (temple, context) => {
    setActiveTemple(temple)
    trackAnalyticsEvent('temple_story_open', {
      temple_name: temple?.name || '',
      temple_state: temple?.state || '',
      temple_city: temple?.city || '',
      open_context: context,
      active_page: activePage,
    })
  }

  const isTempleSaved = (temple) =>
    temple ? savedTemples.includes(slugify(`${temple.name}-${temple.city}-${temple.state}`)) : false

  const toggleSaveTemple = (temple, event) => {
    if (event) event.stopPropagation()
    const slug = slugify(`${temple.name}-${temple.city}-${temple.state}`)
    setSavedTemples((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }

  const isTempleVisited = (temple) =>
    temple ? visitedTemples.includes(slugify(`${temple.name}-${temple.city}-${temple.state}`)) : false

  const toggleVisitTemple = (temple, event) => {
    if (event) event.stopPropagation()
    const slug = slugify(`${temple.name}-${temple.city}-${temple.state}`)
    setVisitedTemples((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const navigateToMapState = (stateName) => {
    handleStateChange(stateName, 'map')
    switchPage('temples')
  }

  const handleModalTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY
    swipeDyRef.current = 0
    if (storyModalRef.current) {
      storyModalRef.current.style.transition = 'none'
    }
  }

  const handleModalTouchMove = (e) => {
    const dy = e.touches[0].clientY - touchStartYRef.current
    if (dy <= 0) return
    swipeDyRef.current = dy
    if (storyModalRef.current) {
      storyModalRef.current.style.transform = `translateY(${dy}px)`
      storyModalRef.current.style.opacity = String(Math.max(0.5, 1 - dy / 300))
    }
  }

  const handleModalTouchEnd = () => {
    const dy = swipeDyRef.current
    if (storyModalRef.current) {
      storyModalRef.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
    }
    if (dy > 100) {
      setActiveTemple(null)
    } else {
      if (storyModalRef.current) {
        storyModalRef.current.style.transform = 'translateY(0)'
        storyModalRef.current.style.opacity = '1'
      }
    }
    swipeDyRef.current = 0
  }

  const handleShare = async () => {
    if (!activeTemple) return
    const slug = slugify(`${activeTemple.name}-${activeTemple.city}-${activeTemple.state}`)
    const url = `${window.location.origin}/temple/${slug}`
    const shareData = {
      title: activeTemple.name,
      text: `${activeTemple.name} — ${activeTemple.city}, ${activeTemple.state}`,
      url,
    }
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch { /* clipboard denied */ }
    }
  }

  const getTempleText = (temple, key) => {
    if (!temple) {
      return ''
    }
    if (language === 'hi') {
      return temple[`${key}Hi`] ?? temple[key]
    }
    return temple[key]
  }

  const withNotAvailable = (value) => {
    if (value === null || value === undefined) return NOT_AVAILABLE_TEXT
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed || NOT_AVAILABLE_TEXT
    }
    return value
  }

  const getTempleDetailText = (temple, key) => withNotAvailable(getTempleText(temple, key))

  const getTempleList = (temple, key) => {
    if (!temple) {
      return []
    }
    if (language === 'hi') {
      return temple[`${key}Hi`] ?? temple[key] ?? []
    }
    return temple[key] ?? []
  }

  const detailCards = activeTemple
    ? [
        { label: t.details.deity, value: getTempleDetailText(activeTemple, 'deity') },
        { label: t.details.tradition, value: getTempleDetailText(activeTemple, 'tradition') },
        { label: t.details.bestTime, value: getTempleDetailText(activeTemple, 'bestTime') },
        { label: t.details.timings, value: getTempleDetailText(activeTemple, 'timings') },
        { label: t.details.dressCode, value: getTempleDetailText(activeTemple, 'dressCode') },
        { label: t.details.entryNotes, value: getTempleDetailText(activeTemple, 'entryNotes') },
      ]
    : []
  const ritualList = getTempleList(activeTemple, 'rituals')
  const festivalList = getTempleList(activeTemple, 'festivals')
  const moreDetails = activeTemple?.moreDetails ?? null
  const moreFallbacks = activeTemple
    ? {
        history: getTempleText(activeTemple, 'story'),
        architecture: (() => {
          const tags = getTempleList(activeTemple, 'tags').map((tag) => tag.toLowerCase())
          if (tags.some((tag) => tag.includes('unesco') || tag.includes('chola') || tag.includes('dravidian'))) {
            return 'Heritage temple architecture with regional stone carving traditions and layered gopuram silhouettes.'
          }
          if (tags.some((tag) => tag.includes('heritage') || tag.includes('ruins'))) {
            return 'Historic stone temple architecture with preserved carvings and timeworn shrine layouts.'
          }
          if (tags.some((tag) => tag.includes('cluster'))) {
            return 'Clustered shrine layout within a heritage precinct, reflecting regional temple planning.'
          }
          return 'Regional temple architecture with a sanctum and mandapa layout.'
        })(),
        darshan: (() => {
          if (!ritualList.length) {
            return 'Darshan is available during open hours; rituals follow local tradition.'
          }
          return `Darshan is available during open hours, with rituals such as ${ritualList.join(' · ')}.`
        })(),
        seasonal: getTempleDetailText(activeTemple, 'bestTime'),
        visitorNotes: getTempleDetailText(activeTemple, 'entryNotes'),
        festivals: festivalList.length ? festivalList.join(' · ') : NOT_AVAILABLE_TEXT,
      }
    : {}
  const getMoreDetail = (key) => {
    if (!moreDetails) {
      return withNotAvailable(moreFallbacks[key])
    }
    if (language === 'hi') {
      return withNotAvailable(moreDetails[`${key}Hi`] ?? moreDetails[key] ?? moreFallbacks[key])
    }
    return withNotAvailable(moreDetails[key] ?? moreFallbacks[key])
  }
  const moreBlocks = moreDetails
    ? [
        { label: t.moreLabels.history, value: getMoreDetail('history') },
        { label: t.moreLabels.architecture, value: getMoreDetail('architecture') },
        { label: t.moreLabels.darshan, value: getMoreDetail('darshan') },
        { label: t.moreLabels.seasonal, value: getMoreDetail('seasonal') },
        { label: t.moreLabels.visitorNotes, value: getMoreDetail('visitorNotes') },
        { label: t.moreLabels.festivals, value: getMoreDetail('festivals') },
      ]
    : []
  const labelForState = (state) => (state === ALL_STATES ? t.panel.allStates : state)
  const labelForCity = (city) => (city === ALL_CITIES ? t.panel.allCities : city)

  const buildPaginationItems = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1)
    }
    const items = [1]
    if (current > 3) items.push('…')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let page = start; page <= end; page += 1) {
      items.push(page)
    }
    if (current < total - 2) items.push('…')
    items.push(total)
    return items
  }

  const renderPagination = (current, total, onPage, context) => {
    if (total <= 1) return null
    const items = buildPaginationItems(current, total)
    return (
      <div className="pagination">
        <button
          className="page-btn"
          type="button"
          disabled={current === 1}
          onClick={() =>
            handlePageChange(Math.max(1, current - 1), current, onPage, context)
          }
        >
          Prev
        </button>
        {items.map((item, index) =>
          item === '…' ? (
            <span className="page-ellipsis" key={`ellipsis-${index}`}>
              …
            </span>
          ) : (
            <button
              className={`page-btn ${item === current ? 'active' : ''}`}
              type="button"
              key={item}
              onClick={() => handlePageChange(item, current, onPage, context)}
            >
              {item}
            </button>
          )
        )}
        <button
          className="page-btn"
          type="button"
          disabled={current === total}
          onClick={() =>
            handlePageChange(Math.min(total, current + 1), current, onPage, context)
          }
        >
          Next
        </button>
      </div>
    )
  }
  return (
    <div className={`app theme-${mode} ${language === 'hi' ? 'lang-hi' : ''}`}>
      <div className="top-bar">
        <button
          className="portal-brand"
          type="button"
          onClick={() => switchPage('temples')}
          aria-label="Go to home"
        >
          <span className="brand-om" aria-hidden="true">ॐ</span>
          <span className="brand-wordmark">
            <span className="brand-name">Jai Bhole Nath</span>
            <span className="brand-sub">Sacred Temple Atlas</span>
          </span>
        </button>
        <div className="top-bar-actions">
          {activePage === 'temples' && featuredTemple ? (
            <button
              className="featured-pill"
              type="button"
              onClick={jumpToFeatured}
            >
              <span className="featured-label">Featured</span>
              <span className="featured-name">{getTempleText(featuredTemple, 'name')}</span>
            </button>
          ) : null}
          <nav className="top-nav" aria-label={t.nav.label}>
            <button
              className={`top-nav-link ${activePage === 'temples' ? 'active' : ''}`}
              type="button"
              aria-current={activePage === 'temples' ? 'page' : undefined}
              onClick={() => switchPage('temples')}
            >
              {t.nav.temples}
            </button>
            <button
              className={`top-nav-link ${activePage === 'recent' ? 'active' : ''}`}
              type="button"
              aria-current={activePage === 'recent' ? 'page' : undefined}
              onClick={() => switchPage('recent')}
            >
              {t.nav.recent}
            </button>
            <button
              className={`top-nav-link ${activePage === 'circuits' ? 'active' : ''}`}
              type="button"
              aria-current={activePage === 'circuits' ? 'page' : undefined}
              onClick={() => switchPage('circuits')}
            >
              {t.nav.circuits}
            </button>
            <button
              className={`top-nav-link ${activePage === 'map' ? 'active' : ''}`}
              type="button"
              aria-current={activePage === 'map' ? 'page' : undefined}
              onClick={() => switchPage('map')}
            >
              {t.nav.map}
            </button>
            <button
              className={`top-nav-link ${activePage === 'about' ? 'active' : ''}`}
              type="button"
              aria-current={activePage === 'about' ? 'page' : undefined}
              onClick={() => switchPage('about')}
            >
              {t.nav.about}
            </button>
          </nav>
        </div>
      </div>

      <div className={`cal-banner${calBannerExpanded ? ' is-expanded' : ''}`}>
        <div className="cal-banner-inner">
          <span className="cal-label">
            <i className="fa-solid fa-sun" aria-hidden="true" />
            {t.cal.todayLabel}
          </span>
          <span className="cal-date">
            {new Date(todayContext.todayStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="cal-vara">{todayContext.vara.hi} · {todayContext.vara.en}</span>
          {todayContext.masa ? (
            <span className="cal-extra cal-masa">{todayContext.masa.name}{todayContext.masa.isAdhika ? ' (Adhika)' : ''}</span>
          ) : null}
          {todayContext.tithi ? (
            <span className="cal-extra cal-tithi">
              {todayContext.tithi.name}
              {todayContext.paksha ? ` · ${todayContext.paksha} Paksha` : ''}
            </span>
          ) : null}
          {todayContext.nakshatra ? (
            <span className="cal-extra cal-nakshatra">
              <i className="fa-solid fa-star" aria-hidden="true" />
              {todayContext.nakshatra.name}
            </span>
          ) : null}
          {todayContext.festival ? (
            <span className="cal-festival">{todayContext.festival.label}</span>
          ) : null}
          {todayContext.sunrise ? (
            <span className="cal-extra cal-sunrise">
              <i className="fa-solid fa-sun" aria-hidden="true" />
              {todayContext.sunrise}
            </span>
          ) : null}
          {todayContext.samvat ? (
            <span className="cal-samvat" title={todayContext.samvat.samvatsara}>
              VS {todayContext.samvat.vikram}
            </span>
          ) : null}
          <button
            className="cal-expand-btn"
            type="button"
            onClick={() => setCalBannerExpanded((prev) => !prev)}
            aria-expanded={calBannerExpanded}
            aria-label={calBannerExpanded ? 'Show less panchang info' : 'Show more panchang info'}
          >
            <i className={`fa-solid ${calBannerExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {API_MODE_ENABLED ? (
        <div className={`api-sync-banner ${apiStatus.error ? 'error' : ''}`}>
          {apiStatusText}
        </div>
      ) : null}

      <div key={activePage} className={`page-view${activePage === 'temples' ? ' page-view--hero' : ''}`}>
      {isAbout ? (
        <>
          <section className="cards about-page" id="about">
            <div className="about-intro">
              <div className="section-header about-header">
                <h2>{t.aboutSection.eyebrow}</h2>
                <p>{t.aboutSection.subtitle}</p>
              </div>
              <div className="about-divider" aria-hidden="true" />
            </div>
            <div className="about-grid">
              {t.aboutSection.cards.map((card, index) => (
                <article className="about-card" key={card.title} style={{ '--delay': `${index * 80}ms` }}>
                  <span className="about-card-badge">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="cards disclaimer-section" aria-label={t.disclaimerSection.title}>
            <div className="disclaimer-card">
              <h3>{t.disclaimerSection.title}</h3>
              <p>{t.disclaimerSection.body}</p>
              <p className="disclaimer-note">{t.disclaimerSection.note}</p>
            </div>
          </section>
        </>
      ) : isRecent ? (
        <section className="cards discoveries-section" id="recent-discoveries">
          <div className="section-header">
            <h2>{t.recentSection.title}</h2>
            <p>{t.recentSection.subtitle}</p>
          </div>
          {isShivaMode && recentItems.length ? (
            <>
              <div className="discovery-grid">
                {pagedRecentItems.map((item, index) => {
                  const source = item.sources?.[0]
                  const summary = item.summary || t.recentSection.pending
                  const period = item.period || t.recentSection.pending
                  const year = item.yearDiscovered || t.recentSection.pending
                  const status = item.status || t.recentSection.pending
                  const location = item.location || t.recentSection.pending
                  const discoveryImage = item.image
                  const discoveryImageAlt = item.imageAlt || `${item.name} discovery site`
                  const discoveryImageCredit = item.imageCredit || 'Wikimedia Commons'
                  const discoveryImageCreditUrl = item.imageCreditUrl
                  return (
                    <article className="discovery-card" key={`${item.name}-${index}`}>
                      {discoveryImage ? (
                        <figure className="discovery-media">
                          <img src={discoveryImage} alt={discoveryImageAlt} loading="lazy" />
                          {discoveryImageCreditUrl ? (
                            <figcaption>
                              <a href={discoveryImageCreditUrl} target="_blank" rel="noreferrer">
                                {discoveryImageCredit}
                              </a>
                            </figcaption>
                          ) : null}
                        </figure>
                      ) : null}
                      <div className="discovery-header">
                        <span className="discovery-badge">{status}</span>
                        <span className="discovery-year">{year}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p className="discovery-location">{location}</p>
                      <p className="discovery-summary">{summary}</p>
                      <div className="discovery-details">
                        <div className="discovery-detail">
                          <span>{t.recentSection.labels.period}</span>
                          <p>{period}</p>
                        </div>
                        <div className="discovery-detail">
                          <span>{t.recentSection.labels.source}</span>
                          {source ? (
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.label}
                            </a>
                          ) : (
                            <p>{t.recentSection.pending}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {renderPagination(recentPage, totalRecentPages, setRecentPage, 'recent')}
              <p className="discovery-note">{t.recentSection.note}</p>
            </>
          ) : (
            <div className="empty-state">
              <h3>
                {isShivaMode ? t.recentSection.emptyTitle : t.recentSection.shaktiOnlyTitle}
              </h3>
              <p>{isShivaMode ? t.recentSection.emptyBody : t.recentSection.shaktiOnlyBody}</p>
            </div>
          )}
        </section>
      ) : isCircuits ? (
        <section className="cards circuits-page" id="circuits">
          <div className="section-header">
            <h2>{t.circuitsTitle}</h2>
            <p>{t.circuitsSubtitle}</p>
          </div>
          <div className="circuits-grid">
            {CIRCUITS.map((circuit) => {
              const circuitTemples = safeTempleData.filter(
                (temple) => Array.isArray(temple.tags) && temple.tags.includes(circuit.tag)
              )
              const visitedCount = circuitTemples.filter((temple) => isTempleVisited(temple)).length
              const pct = circuitTemples.length
                ? Math.round((visitedCount / circuitTemples.length) * 100)
                : 0
              return (
                <div key={circuit.id} className={`circuit-card tradition-${circuit.tradition}`}>
                  <div className="circuit-card-head">
                    <span className="circuit-icon">
                      <i className={`fa-solid ${circuit.icon}`} aria-hidden="true" />
                    </span>
                    <div className="circuit-meta">
                      <h3>{circuit.name}</h3>
                      <p>{circuit.description}</p>
                    </div>
                    <div
                      className="circuit-progress-ring"
                      title={`${visitedCount}/${circuitTemples.length}`}
                    >
                      <svg viewBox="0 0 36 36" aria-hidden="true">
                        <circle
                          cx="18" cy="18" r="15.9"
                          fill="none"
                          stroke="var(--border-soft)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18" cy="18" r="15.9"
                          fill="none"
                          stroke="var(--ember)"
                          strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset="25"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>{visitedCount}</span>
                    </div>
                  </div>
                  <p className="circuit-count">
                    {t.circuitsProgress(visitedCount, circuitTemples.length)}
                    {circuit.canonicalCount > circuitTemples.length
                      ? ` (${circuitTemples.length} of ${circuit.canonicalCount} canonical in database)`
                      : ''}
                  </p>
                  <div className="circuit-temple-list">
                    {circuitTemples.map((temple) => (
                      <button
                        key={temple.name}
                        className={`circuit-temple-item${isTempleVisited(temple) ? ' visited' : ''}`}
                        type="button"
                        onClick={() => openTempleStory(temple, 'circuits_page')}
                      >
                        <i
                          className={
                            isTempleVisited(temple)
                              ? 'fa-solid fa-circle-check'
                              : 'fa-regular fa-circle'
                          }
                          aria-hidden="true"
                        />
                        <span>{getTempleText(temple, 'name')}</span>
                        <span className="circuit-temple-loc">{temple.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : isMap ? (
        <section className="cards map-page" id="map">
          <div className="section-header">
            <h2>{t.mapTitle}</h2>
            <p>{t.mapSubtitle}</p>
          </div>
          <div className="region-tabs" role="tablist">
            {REGIONS.filter((region) =>
              region.states.some((s) => activeStates.includes(s))
            ).map((region) => (
              <button
                key={region.id}
                role="tab"
                aria-selected={activeRegion === region.id}
                className={`region-tab${activeRegion === region.id ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveRegion(region.id)}
              >
                {language === 'hi' ? region.labelHi : region.label}
              </button>
            ))}
          </div>
          {REGIONS.filter((region) => region.id === activeRegion).map((region) => (
            <div key={region.id} className="region-state-grid">
              {region.states
                .filter((s) => activeStates.includes(s))
                .map((stateName) => {
                  const count = safeTempleData.filter((temple) => temple.state === stateName).length
                  return (
                    <button
                      key={stateName}
                      className="state-tile"
                      type="button"
                      onClick={() => navigateToMapState(stateName)}
                    >
                      <span className="state-tile-name">{stateName}</span>
                      <span className="state-tile-count">{t.templeCount(count)}</span>
                    </button>
                  )
                })}
            </div>
          ))}
        </section>
      ) : (
        <>
          <section className="stories-section">
            <div className="stories-hero-shell">
              <div className="stories-hero-main">
                <div className="stories-hero-copy">
                  <h1 className="stories-title">{t.heroTitle}</h1>
                  <p className="stories-subtitle">{t.heroSubtitle}</p>

                  <div className="hero-cta-row">
                    <button className="primary" type="button" onClick={jumpToEditorsPicks}>
                      {t.heroActions.view}
                    </button>
                    <button className="link" type="button" onClick={() => switchPage('recent')}>
                      {t.nav.recent}
                    </button>
                  </div>

                  <div className="hero-proof-row">
                    <div className="hero-stat">
                      <span className="hero-stat-number">{templeStats.temples.toLocaleString()}</span>
                      <span className="hero-stat-label">{t.stats.temples}</span>
                    </div>
                    <div className="hero-stat">
                      <span className="hero-stat-number">{templeStats.states.toLocaleString()}</span>
                      <span className="hero-stat-label">{t.stats.states}</span>
                    </div>
                    <div className="hero-stat">
                      <span className="hero-stat-number">{sourcedTemplesCount.toLocaleString()}</span>
                      <span className="hero-stat-label">{t.heroProof.sources}</span>
                    </div>
                  </div>

                  <div className="hero-intent-block">
                    <p className="hero-intent-title">{t.heroJourneys.title}</p>
                    <div className="hero-intent-list">
                      {heroJourneyItems.map((item) => (
                        <button
                          className={`hero-intent-chip ${
                            editorJourneyFilter === item.term ? 'active' : ''
                          }`}
                          type="button"
                          key={item.label}
                          onClick={() => applyHeroJourney(item)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {featuredTemple ? (
                  <article className="hero-featured-card">
                    <figure className="hero-featured-media">
                      <img
                        src={featuredStoryImage}
                        alt={`${getTempleText(featuredTemple, 'name')} in ${featuredTemple.city}`}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallbackApplied) return
                          event.currentTarget.dataset.fallbackApplied = '1'
                          event.currentTarget.src = getPlaceholderImage(featuredTemple.name)
                        }}
                      />
                    </figure>
                    <div className="hero-featured-body">
                      <p className="hero-featured-eyebrow">{t.heroStory.eyebrow}</p>
                      <h3>{getTempleText(featuredTemple, 'name')}</h3>
                      <p className="hero-featured-meta">
                        {featuredTemple.city}, {featuredTemple.state}
                      </p>
                      {featuredStoryTags.length ? (
                        <div className="hero-featured-tags">
                          {featuredStoryTags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      <p>{featuredStorySnippet}</p>
                      {featuredStoryHighlight ? (
                        <p className="hero-featured-highlight">
                          <span>{t.highlightLabel}</span>
                          {featuredStoryHighlight}
                        </p>
                      ) : null}
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => openTempleStory(featuredTemple, 'hero_featured')}
                      >
                        {t.heroStory.read}
                      </button>
                      {featuredStoryCredit && featuredStoryCreditUrl ? (
                        <a
                          className="hero-featured-credit"
                          href={featuredStoryCreditUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {featuredStoryCredit}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ) : null}
              </div>
            </div>
          </section>

          <section className="quick-find-section" aria-label={t.panel.title}>
            <div className="quick-find-header">
              <h2>{t.panel.title}</h2>
              <p>{t.panel.subtitle}</p>
            </div>
            <div className="stories-filter-wrap">
              <form
                className="filters-container"
                role="search"
                aria-label={t.panel.title}
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="search-autocomplete-wrap">
                  <label className="input-group search-wrapper" htmlFor="filter-search">
                    <span className="sr-only">{t.panel.searchLabel}</span>
                    <i className="fa-solid fa-magnifying-glass input-icon" aria-hidden="true" />
                    <input
                      id="filter-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => { setSearchTerm(event.target.value); setShowSuggestions(true) }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder={t.panel.searchPlaceholder}
                      aria-label={t.panel.searchLabel}
                      aria-controls="search-results"
                      aria-autocomplete="list"
                      enterKeyHint="search"
                      autoComplete="off"
                    />
                  </label>
                  {showSuggestions && searchSuggestions.length > 0 ? (
                    <ul className="search-suggestions" role="listbox" aria-label="Temple suggestions">
                      {searchSuggestions.map((temple) => (
                        <li key={`${temple.name}-${temple.city}`} role="option">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setSearchTerm('')
                              setShowSuggestions(false)
                              openTempleStory(temple, 'search_autocomplete')
                            }}
                          >
                            <span className="suggestion-name">{getTempleText(temple, 'name')}</span>
                            <span className="suggestion-loc">{temple.city}, {temple.state}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <label className="input-group" htmlFor="filter-state">
                  <span className="sr-only">{t.panel.stateLabel}</span>
                  <select
                    id="filter-state"
                    value={selectedState}
                    onChange={(event) => handleStateChange(event.target.value, 'dropdown')}
                    aria-label={t.panel.stateLabel}
                  >
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {labelForState(state)}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down input-icon" aria-hidden="true" />
                </label>

                <label className="input-group" htmlFor="filter-city">
                  <span className="sr-only">{t.panel.cityLabel}</span>
                  <select
                    id="filter-city"
                    value={selectedCity}
                    onChange={(event) => handleCityChange(event.target.value)}
                    aria-label={t.panel.cityLabel}
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {labelForCity(city)}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down input-icon" aria-hidden="true" />
                </label>

                {savedTemples.length > 0 ? (
                  <button
                    className={`ghost saved-filter-toggle${showSavedOnly ? ' active' : ''}`}
                    type="button"
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                  >
                    <i className="fa-solid fa-bookmark" aria-hidden="true" />
                    {showSavedOnly ? t.panel.showAll : `${t.panel.savedOnly} (${savedTemples.length})`}
                  </button>
                ) : null}

                {searchActive ? (
                  <button
                    className="ghost hero-clear-btn"
                    type="button"
                    onClick={clearFilters}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                    {t.panel.clearFilters}
                  </button>
                ) : null}
              </form>

              {/* Tag filter chips */}
              <div className="tag-chips" role="group" aria-label="Filter by type">
                {CIRCUITS.filter((circuit) => circuit.id !== 'shakti-peetha').map((circuit) => (
                  <button
                    key={circuit.id}
                    type="button"
                    className={`tag-chip${editorJourneyFilter === circuit.tag.toLowerCase() ? ' active' : ''}`}
                    onClick={() => {
                      const next = editorJourneyFilter === circuit.tag.toLowerCase() ? '' : circuit.tag.toLowerCase()
                      setEditorJourneyFilter(next)
                      setCurrentPage(1)
                      setSearchPage(1)
                    }}
                  >
                    <i className={`fa-solid ${circuit.icon}`} aria-hidden="true" />
                    {circuit.name}
                  </button>
                ))}
              </div>

              {/* Active filter pills */}
              {searchActive ? (
                <div className="active-filters" role="list" aria-label="Active filters">
                  {selectedState !== ALL_STATES ? (
                    <span className="filter-pill" role="listitem">
                      {selectedState}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        onClick={() => handleStateChange(ALL_STATES, 'dropdown')}
                        aria-label={`Remove state filter: ${selectedState}`}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                  {selectedCity !== ALL_CITIES ? (
                    <span className="filter-pill" role="listitem">
                      {selectedCity}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        onClick={() => handleCityChange(ALL_CITIES)}
                        aria-label={`Remove city filter: ${selectedCity}`}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                  {searchTerm.trim() ? (
                    <span className="filter-pill" role="listitem">
                      "{searchTerm.trim()}"
                      <button
                        type="button"
                        className="filter-pill-remove"
                        onClick={() => setSearchTerm('')}
                        aria-label="Remove search term"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                  {editorJourneyFilter ? (
                    <span className="filter-pill" role="listitem">
                      {activeJourneyLabel || editorJourneyFilter}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        onClick={() => { setEditorJourneyFilter(''); setCurrentPage(1); setSearchPage(1) }}
                        aria-label="Remove type filter"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                  {showSavedOnly ? (
                    <span className="filter-pill" role="listitem">
                      {t.panel.savedOnly}
                      <button
                        type="button"
                        className="filter-pill-remove"
                        onClick={() => setShowSavedOnly(false)}
                        aria-label="Remove saved filter"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV ? (
              <div className="hero-audit-row">
                <button
                  className="ghost"
                  type="button"
                  onClick={runImageAudit}
                  disabled={auditStatus.running || selectedState === ALL_STATES}
                >
                  {auditStatus.running
                    ? `Auditing ${selectedState} images (${auditStatus.done}/${auditStatus.total})`
                    : 'Audit state images (dev)'}
                </button>
              </div>
            ) : null}
          </section>

          {searchActive ? (
            <section className="cards cards-search" id="search-results">
              <div className="section-header compact">
                <h2>{t.searchSection.title}</h2>
                <p aria-live="polite">{t.searchSection.subtitle(effectiveSearchTotal)}</p>
              </div>
              <div className="card-grid">
                {pagedSearchTemples.map((temple, index) => {
                  const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                  const storyText = getTempleText(temple, 'story')
                  return (
                    <article
                      className="temple-card"
                      key={`search-${temple.name}-${index}`}
                      style={{ '--delay': `${index * 60}ms` }}
                      onClick={() => openTempleStory(temple, 'search_results')}
                    >
                      <figure className="card-media">
                        <img
                          src={imageSrc}
                          alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                          loading="lazy"
                          onError={(event) => {
                            if (event.currentTarget.dataset.fallbackApplied) return
                            event.currentTarget.dataset.fallbackApplied = '1'
                            event.currentTarget.src = getPlaceholderImage(temple.name)
                          }}
                        />
                        <button
                          className={`card-bookmark${isTempleSaved(temple) ? ' is-saved' : ''}`}
                          type="button"
                          onClick={(e) => toggleSaveTemple(temple, e)}
                          aria-label={isTempleSaved(temple) ? t.modal.saved : t.modal.save}
                          aria-pressed={isTempleSaved(temple)}
                        >
                          <i className={isTempleSaved(temple) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} aria-hidden="true" />
                        </button>
                        {temple.image && temple.creditUrl && temple.credit ? (
                          <figcaption>
                            <a href={temple.creditUrl} target="_blank" rel="noreferrer">
                              {temple.credit}
                            </a>
                          </figcaption>
                        ) : null}
                      </figure>
                      <div className="card-body">
                        <div className="card-meta">
                          <span className="card-location">
                            <span className="location-dot" aria-hidden="true" />
                            {temple.city}, {temple.state}
                          </span>
                          {getTempleText(temple, 'region') ? (
                            <span className="card-region">{getTempleText(temple, 'region')}</span>
                          ) : null}
                        </div>
                        <h3>{getTempleText(temple, 'name')}</h3>
                        <p>{storyText}</p>
                        <div className="card-footer">
                          <button
                            className="card-action"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openTempleStory(temple, 'search_results') }}
                          >
                            {t.readFullStory}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {renderPagination(searchPage, totalSearchPages, setSearchPage, 'search')}
              {effectiveSearchTotal === 0 ? (
                <div className="empty-state">
                  <h3>{t.searchEmpty.title}</h3>
                  <p>{t.searchEmpty.body}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {!searchActive && effectiveNewlyAddedTemples.length ? (
            <section className="cards" id="newly-added-temples">
              <div className="section-header compact">
                <h2>
                  <span className="newly-added-live-dot" aria-hidden="true" />
                  {t.newlyAddedSection.title}
                </h2>
                <p>{t.newlyAddedSection.subtitle}</p>
              </div>
              <div className="card-grid">
                {(() => {
                  const TIER_ORDER = ['today', 'thisWeek', 'thisMonth', 'earlier']
                  const tierLabels = t.newlyAddedSection.tierLabels
                  const sliced = showAllNewlyAdded
                    ? effectiveNewlyAddedTemples.slice(0, 60)
                    : effectiveNewlyAddedTemples.slice(0, NEWLY_ADDED_DISPLAY)
                  const items = []
                  for (const tierKey of TIER_ORDER) {
                    const group = sliced.filter((temple) => getNewlyAddedTier(temple.addedAt, nowTs) === tierKey)
                    if (!group.length) continue
                    items.push(
                      <div key={`tier-${tierKey}`} className="tier-label">{tierLabels[tierKey]}</div>
                    )
                    group.forEach((temple, index) => {
                      const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                      const storyText = getTempleText(temple, 'story')
                      const relativeTime = getRelativeAddedAt(temple.addedAt, nowTs)
                      items.push(
                        <article
                          className="temple-card"
                          key={`newly-added-${temple.name}`}
                          style={{ '--delay': `${index * 60}ms` }}
                          onClick={() => openTempleStory(temple, 'newly_added')}
                        >
                          <figure className="card-media">
                            <img
                              src={imageSrc}
                              alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                              loading="lazy"
                              onError={(event) => {
                                if (event.currentTarget.dataset.fallbackApplied) return
                                event.currentTarget.dataset.fallbackApplied = '1'
                                event.currentTarget.src = getPlaceholderImage(temple.name)
                              }}
                            />
                            <div className="card-new-badge" aria-hidden="true">New</div>
                            <button
                              className={`card-bookmark${isTempleSaved(temple) ? ' is-saved' : ''}`}
                              type="button"
                              onClick={(e) => toggleSaveTemple(temple, e)}
                              aria-label={isTempleSaved(temple) ? t.modal.saved : t.modal.save}
                              aria-pressed={isTempleSaved(temple)}
                            >
                              <i className={isTempleSaved(temple) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} aria-hidden="true" />
                            </button>
                            {temple.image && temple.creditUrl && temple.credit ? (
                              <figcaption>
                                <a href={temple.creditUrl} target="_blank" rel="noreferrer">
                                  {temple.credit}
                                </a>
                              </figcaption>
                            ) : null}
                          </figure>
                          <div className="card-body">
                            <div className="card-meta">
                              <span className="card-location">
                                <span className="location-dot" aria-hidden="true" />
                                {temple.city}, {temple.state}
                              </span>
                              {getTempleText(temple, 'region') ? (
                                <span className="card-region">{getTempleText(temple, 'region')}</span>
                              ) : null}
                            </div>
                            <h3>{getTempleText(temple, 'name')}</h3>
                            <p>{storyText}</p>
                            <div className="card-footer">
                              <button
                                className="card-action"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openTempleStory(temple, 'newly_added') }}
                              >
                                {t.readFullStory}
                              </button>
                              <span className="card-readtime">{relativeTime}</span>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  }
                  return items
                })()}
              </div>
              {effectiveNewlyAddedTemples.length > NEWLY_ADDED_DISPLAY ? (
                <div className="newly-added-footer">
                  <button
                    type="button"
                    className="newly-added-see-all"
                    onClick={() => setShowAllNewlyAdded((prev) => !prev)}
                  >
                    {showAllNewlyAdded ? t.newlyAddedSection.showLess : t.newlyAddedSection.seeAll}
                    <i className={`fa-solid ${showAllNewlyAdded ? 'fa-chevron-up' : 'fa-arrow-right'}`} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {!searchActive ? <section className="cards" id="temple-cards">
            <div className="section-header">
              <h2>{t.cardsSection.title}</h2>
              <p>{t.cardsSection.subtitle}</p>
              <div className="section-tags" role="list">
                <span className="section-chip" role="listitem">
                  {modeLabel}
                </span>
                <span className="section-chip" role="listitem">
                  {storyStateLabel}
                </span>
                {activeJourneyLabel ? (
                  <span className="section-chip" role="listitem">
                    {activeJourneyLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="card-grid">
              {pagedTemples.map((temple, index) => {
                const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                const storyText = getTempleText(temple, 'story')
                return (
                  <article
                    className="temple-card"
                    id={getTempleId(temple, index)}
                    key={temple.name}
                    style={{ '--delay': `${index * 80}ms` }}
                    onClick={() => openTempleStory(temple, 'temple_cards')}
                  >
                    <figure className="card-media">
                      <img
                        src={imageSrc}
                        alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallbackApplied) return
                          event.currentTarget.dataset.fallbackApplied = '1'
                          event.currentTarget.src = getPlaceholderImage(temple.name)
                        }}
                      />
                      <button
                        className={`card-bookmark${isTempleSaved(temple) ? ' is-saved' : ''}`}
                        type="button"
                        onClick={(e) => toggleSaveTemple(temple, e)}
                        aria-label={isTempleSaved(temple) ? t.modal.saved : t.modal.save}
                        aria-pressed={isTempleSaved(temple)}
                      >
                        <i className={isTempleSaved(temple) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} aria-hidden="true" />
                      </button>
                      {temple.image && temple.creditUrl && temple.credit ? (
                        <figcaption>
                          <a href={temple.creditUrl} target="_blank" rel="noreferrer">
                            {temple.credit}
                          </a>
                        </figcaption>
                      ) : null}
                    </figure>
                    <div className="card-body">
                      <div className="card-meta">
                        <span className="card-location">
                          <span className="location-dot" aria-hidden="true" />
                          {temple.city}, {temple.state}
                        </span>
                        {getTempleText(temple, 'region') ? (
                          <span className="card-region">{getTempleText(temple, 'region')}</span>
                        ) : null}
                      </div>
                      <h3>{getTempleText(temple, 'name')}</h3>
                      <p>{storyText}</p>
                      <div className="card-footer">
                        <button
                          className="card-action"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openTempleStory(temple, 'temple_cards') }}
                        >
                          {t.readFullStory}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            {renderPagination(currentPage, totalPages, setCurrentPage, 'temples')}
            {effectiveDisplayedTotal === 0 ? (
              <div className="empty-state">
                <h3>{t.emptyState.title}</h3>
                <p>{t.emptyState.body}</p>
                <button className="ghost" type="button" onClick={clearFilters}>{t.emptyState.cta}</button>
              </div>
            ) : null}
          </section> : null}

        </>
      )}
      </div>

      {activeTemple ? (
        <div className="story-overlay" onClick={() => setActiveTemple(null)}>
          <div
            className="story-modal"
            ref={storyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
          >
            <div className="modal-drag-handle" aria-hidden="true" />
            <div className="story-modal-actions">
              <button
                className={`story-visited${isTempleVisited(activeTemple) ? ' is-visited' : ''}`}
                type="button"
                onClick={(e) => toggleVisitTemple(activeTemple, e)}
                aria-pressed={isTempleVisited(activeTemple)}
                aria-label={isTempleVisited(activeTemple) ? t.modal.visited : t.modal.markVisited}
              >
                <i className={isTempleVisited(activeTemple) ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} aria-hidden="true" />
                {isTempleVisited(activeTemple) ? t.modal.visited : t.modal.markVisited}
              </button>
              <button
                className={`story-save${isTempleSaved(activeTemple) ? ' is-saved' : ''}`}
                type="button"
                onClick={(e) => toggleSaveTemple(activeTemple, e)}
                aria-pressed={isTempleSaved(activeTemple)}
                aria-label={isTempleSaved(activeTemple) ? t.modal.saved : t.modal.save}
              >
                <i className={isTempleSaved(activeTemple) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} aria-hidden="true" />
                {isTempleSaved(activeTemple) ? t.modal.saved : t.modal.save}
              </button>
              <button className="story-share" type="button" onClick={handleShare} aria-label={t.modal.share}>
                <i className="fa-solid fa-share-nodes" aria-hidden="true" />
                {shareCopied ? t.modal.copied : t.modal.share}
              </button>
              <button
                className="story-close"
                type="button"
                ref={storyCloseButtonRef}
                onClick={() => setActiveTemple(null)}
                aria-label={t.modal.close}
              >
                {t.modal.close}
              </button>
            </div>
            <div className={`story-hero ${isPortraitImage ? 'is-portrait' : ''}`}>
              <img
                src={modalImageSrc}
                alt={`${getTempleText(activeTemple, 'name')} in ${activeTemple.city}`}
                loading="lazy"
                onError={() => {
                  if (activeTemple) {
                    setModalImageSrc(getPlaceholderImage(activeTemple.name))
                    setIsPortraitImage(false)
                  }
                }}
              />
              {activeTemple.image && activeTemple.creditUrl && activeTemple.credit ? (
                <a href={activeTemple.creditUrl} target="_blank" rel="noreferrer">
                  {activeTemple.credit}
                </a>
              ) : null}
            </div>
            <div className="story-header">
              <p className="story-eyebrow">{t.modal.eyebrow}</p>
              <h2 id="story-title">{getTempleText(activeTemple, 'name')}</h2>
              <p className="story-location">
                {activeTemple.city}, {activeTemple.state} · {getTempleText(activeTemple, 'region')}
              </p>
              <div className="story-tags">
                {getTempleList(activeTemple, 'tags').map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="story-content">
              <div className="story-body">
                <div className="story-section">
                  <h3>{t.modal.story}</h3>
                  <p>{getTempleText(activeTemple, 'story')}</p>
                </div>
                <div className="story-section highlight">
                  <h3>{t.modal.signature}</h3>
                  <p>{getTempleText(activeTemple, 'highlight')}</p>
                </div>
                {detailCards.length ? (
                  <div className="story-section">
                    <h3>{t.modal.coreDetails}</h3>
                    <div className="story-details">
                      {detailCards.map((item) => (
                        <div className="detail-card" key={item.label}>
                          <span className="detail-label">{item.label}</span>
                          <p className="detail-value">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="story-section">
                  <h3>{t.modal.rituals}</h3>
                  <p>{ritualList.length ? ritualList.join(' · ') : NOT_AVAILABLE_TEXT}</p>
                </div>
                <div className="story-section">
                  <h3>{t.modal.festivals}</h3>
                  <p>{festivalList.length ? festivalList.join(' · ') : NOT_AVAILABLE_TEXT}</p>
                </div>
                <div className="story-section">
                  <h3>{t.modal.more}</h3>
                  {moreBlocks.length ? (
                    <div className="story-more">
                      {moreBlocks.map((item) => (
                        <div className="story-block" key={item.label}>
                          <h4>{item.label}</h4>
                          <p>{item.value}</p>
                        </div>
                      ))}
                      {moreDetails?.sources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.sources}</h4>
                          <div className="source-list">
                            {moreDetails.sources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {moreDetails?.puranicSources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.puranicSources}</h4>
                          <div className="source-list">
                            {moreDetails.puranicSources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {moreDetails?.folkloreSources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.folkloreSources}</h4>
                          <div className="source-list">
                            {moreDetails.folkloreSources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p>{t.modal.empty}</p>
                  )}
                </div>
                {similarTemples.length > 0 ? (
                  <div className="story-similar">
                    <h4 className="story-similar-title">{t.modal.similarTitle}</h4>
                    <div className="similar-grid">
                      {similarTemples.map((temple) => (
                        <button
                          key={temple.name}
                          className="similar-card"
                          type="button"
                          onClick={() => openTempleStory(temple, 'similar_temples')}
                        >
                          <div className="similar-card-img">
                            <img
                              src={temple.image ?? getPlaceholderImage(temple.name)}
                              alt={getTempleText(temple, 'name')}
                              loading="lazy"
                              onError={(e) => { e.currentTarget.src = getPlaceholderImage(temple.name) }}
                            />
                          </div>
                          <div className="similar-card-body">
                            <p className="similar-card-name">{getTempleText(temple, 'name')}</p>
                            <p className="similar-card-loc">{temple.city}, {temple.state}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {FEEDBACK_EMAIL ? (
                  <div className="story-report">
                    <p className="story-report-note">
                      <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                      {t.modal.reportNote}
                    </p>
                    <a
                      href={buildReportMailto(activeTemple, FEEDBACK_EMAIL)}
                      className="story-report-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                      {t.modal.report}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="bottom-nav" aria-label={t.nav.label}>
        <button
          className={`bottom-nav-item${activePage === 'temples' ? ' active' : ''}`}
          type="button"
          aria-current={activePage === 'temples' ? 'page' : undefined}
          onClick={() => switchPage('temples')}
        >
          <i className="fa-solid fa-om" aria-hidden="true" />
          <span>{t.nav.temples}</span>
        </button>
        <button
          className={`bottom-nav-item${activePage === 'recent' ? ' active' : ''}`}
          type="button"
          aria-current={activePage === 'recent' ? 'page' : undefined}
          onClick={() => switchPage('recent')}
        >
          <i className="fa-solid fa-star" aria-hidden="true" />
          <span>{t.nav.recent}</span>
        </button>
        <button
          className={`bottom-nav-item${activePage === 'circuits' ? ' active' : ''}`}
          type="button"
          aria-current={activePage === 'circuits' ? 'page' : undefined}
          onClick={() => switchPage('circuits')}
        >
          <i className="fa-solid fa-fire" aria-hidden="true" />
          <span>{t.nav.circuits}</span>
        </button>
        <button
          className={`bottom-nav-item${activePage === 'map' ? ' active' : ''}`}
          type="button"
          aria-current={activePage === 'map' ? 'page' : undefined}
          onClick={() => switchPage('map')}
        >
          <i className="fa-solid fa-map" aria-hidden="true" />
          <span>{t.nav.map}</span>
        </button>
        <button
          className={`bottom-nav-item${activePage === 'about' ? ' active' : ''}`}
          type="button"
          aria-current={activePage === 'about' ? 'page' : undefined}
          onClick={() => switchPage('about')}
        >
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <span>{t.nav.about}</span>
        </button>
      </nav>

    </div>
  )
}

export default App
