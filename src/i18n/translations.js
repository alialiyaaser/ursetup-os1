// Bilingual dictionary for UR SETUP
export const translations = {
  en: {
    dir: "ltr",
    nav: {
      home: "Home",
      products: "Products",
      about: "About",
      reviews: "Reviews",
      faq: "FAQ",
      contact: "Contact",
      shop: "Visit Store",
    },
    lang: { toggle: "AR", label: "العربية" },
    loader: {
      title: "UR SETUP",
      sub: "Premium Setup Accessories",
    },
    hero: {
      kicker: "PREMIUM SETUP ACCESSORIES — EST. RIYADH",
      title1: "Elevate",
      title2: "Your Setup.",
      subtitle:
        "A Saudi brand specializing in setup accessories; we offer high-quality, modernly designed products for office and gaming enthusiasts.",
      shop: "Shop Now",
      explore: "Explore Craft",
      marqueeItems: ["Never settle for anything less than luxury", "A companion for every ambitious gamer", "Fast and free shipping", "Gallery-quality craftsmanship", "Handcrafted Details"],
    },
    products: {
      kicker: "Carefully selected products to give you a professional setup experience. / 04 ARTIFACTS",
      title: "Our Featured Products",
      subtitle:
        "Each mousepad is a study in restraint — precision-stitched edges, low-friction micro-weave, and cinema-grade marble prints that photograph as beautifully as they perform.",
      items: {
        "grey-marble": {
          name: "Grey Marble",
          tag: "Signature",
          desc: "A monochrome canvas of graphite veins. Balanced glide. The all-day workhorse.",
        },
        "white-marble": {
          name: "White Marble",
          tag: "Editorial",
          desc: "Bright, gallery-white with soft silver striations. Photographs like a curated setup should.",
        },
        "dark-marble": {
          name: "Dark Marble",
          tag: "Nocturne",
          desc: "Deep obsidian with silver veins. Built for late-night sessions and cinematic desks.",
        },
        "PINK-marble": {
         name: "PINK Marble",
         tag: "Limited",
         desc: "Premium marble edition.",
       },
      },
      cta: "View on store",
      specTitle: "The specification",
      specs: [
        ["Surface", "Ultra-smooth micro-weave"],
        ["Base", "Anti-slip natural rubber"],
        ["Edges", "Precision-stitched, no fray"],
        ["Care", "Machine washable · cold"],
      ],
    },
    about: {
      kicker: "ABOUT UR SETUP",
      title: "Crafted for those who curate.",
      p1: "UR SETUP is a Saudi-born design house dedicated to the desk. We treat setup accessories the way galleries treat objects — chosen materials, restrained silhouettes, obsessive detailing.",
      p2: "We ship from Riyadh to the world, one considered artifact at a time.",
      cta: "Visit the store",
    },
    why: {
      kicker: "WHY UR SETUP",
      title: "Details others overlook.",
      items: [
        { t: "Fast fulfillment", d: "Dispatched from Riyadh with tracked delivery across the Kingdom and beyond." },
        { t: "Museum-grade finish", d: "Photographed like art, engineered for a lifetime of daily use." },
        { t: "Secure checkout", d: "Powered by Salla — payments protected end-to-end." },
        { t: "Human support", d: "Our team responds in Arabic and English, seven days a week." },
      ],
    },
    reviews: {
      kicker: "VOICES FROM THE COMMUNITY",
      title: "Trusted by players and pros.",
      subtitle: "Every review below is written by an actual owner. Nothing scripted, nothing paid.",
      writeCta: "Write a Review",
      formTitle: "Share your experience",
      name: "Your name",
      country: "Country (optional)",
      product: "Product",
      rating: "Rating",
      commentTitle: "Headline (optional)",
      comment: "Tell us how it feels",
      submit: "Submit Review",
      submitting: "Submitting…",
      success: "Thank you — your review is live.",
      error: "Something went wrong. Please try again.",
      average: "Average rating",
      basedOn: (n) => `Based on ${n} verified review${n === 1 ? "" : "s"}`,
      breakdown: "Rating breakdown",
      verified: "Verified owner",
      empty: "Be the first to share your experience.",
    },
    testimonials: {
      kicker: "COMMUNITY SETUPS",
      title: "Real desks. Real players.",
      subtitle: "Curated setups from the UR SETUP community across three continents.",
    },
    faq: {
      kicker: "QUESTIONS · ANSWERED",
      title: "Everything you might ask.",
      items: [
        {
          q: "Where do you ship?",
          a: "We ship within the Kingdom of Saudi Arabia and the Gulf countries.",
        },
        {
          q: "How long does delivery take?",
          a: "Within Saudi Arabia: 2 to 4 business days. Gulf countries: Depends on the destination.",
        },
        {
          q: "Are your mousepads washable?",
          a: "Yes. Cold water, gentle detergent, air dry flat. The stitched edges will not fray.",
        },
        {
          q: "Do you offer bulk / corporate orders?",
          a: "Yes — for esports teams, offices and gifting. Contact us for custom pricing.",
        },
        {
          q: "What is your return policy?",
          a: "Unused items in original packaging can be returned within 14 days. Details on the Salla store.",
        },
        {
          q: "Do your products come with a warranty?",
          a: " Shop with confidence! If you are not satisfied with your product or it doesn't meet your expectations, we guarantee a full refund within 7 days of delivery."
           },
          {
           q: "When can I contact customer support?",
           a: "Our team is available 24/7 throughout the week! On Fridays, we are available to assist you from 1:30 PM to 6:30 PM"
            },
      ],
    },
    newsletter: {
      kicker: "THE INSIDER",
      title: "Drops, discounts, and desk inspiration.",
      subtitle: "One considered email a month. Never spam.",
      placeholder: "your@email.com",
      cta: "Subscribe",
      success: "You're in. Welcome to the inside.",
      error: "Please enter a valid email.",
    },
    stats: {
      customers: "Happy owners",
      orders: "Orders shipped",
      rating: "Average rating",
      secure: "Secure checkout",
    },
    contact: {
      kicker: "We’re waiting for your message",
      title: "Glad to have you with us.",
      subtitle: "Instagram, TikTok, or our store — we answer within one working day.",
      whatsapp: "WhatsApp us",
    },
    footer: {
      tagline: "Premium setup accessories, born in Riyadh.",
      links: "Quick links",
      social: "Social",
      legal: "© {year} UR SETUP. All rights reserved.",
      craft: "Crafted with obsession in KSA.",
    },
    products_slugs: {
      "grey-marble": "Grey Marble",
      "white-marble": "White Marble",
      "dark-marble": "Dark Marble",
    },
  },
  ar: {
    dir: "rtl",
    nav: {
      home: "الرئيسية",
      products: "المنتجات",
      about: "من نحن",
      reviews: "التقييمات",
      faq: "الأسئلة",
      contact: "تواصل",
      shop: "زيارة المتجر",
    },
    lang: { toggle: "EN", label: "English" },
    loader: {
      title: "UR SETUP",
      sub: "إكسسوارات سيت أب فاخرة",
    },
    hero: {
      kicker: "إكسسوارات سيت أب فاخرة — الرياض",
      title1: "ارتقِ",
      title2: "بسيت ابك.",
      subtitle:
        "علامة تجارية سعودية متخصصة في إكسسوارات السيت أب، نقدم منتجات عالية الجودة بتصميم عصري لمحبي المكاتب والألعاب.",
      shop: "تسوق الآن",
      explore: "استكشف الحرفية",
      marqueeItems: ["لا ترضى بأقل من الفخامة", "رفيق كل قيمر طموح", "شحن سريع ومجاني", "جودة معارض الفن", "تفاصيل يدوية"],
    },
    products: {
      kicker: "منتجات مختارة بعناية لتمنحك تجربة Setup احترافية. / ٠٤ قِطع",
      title: "منتجاتنا المميزة",
      subtitle:
        "كل ماوس باد دراسة في الأناقة — حواف مخيطة بدقة، نسيج ميكروي منخفض الاحتكاك، وطباعة رخامية سينمائية تتألق أمام الكاميرا كما تتألق تحت يدك.",
      items: {
        "grey-marble": {
          name: "الرخام الرمادي",
          tag: "التوقيع",
          desc: "لوحة أحادية اللون بعروق جرافيتية. انزلاق متوازن. رفيق يومك المثالي.",
        },
        "white-marble": {
          name: "الرخام الأبيض",
          tag: "التحريري",
          desc: "أبيض معرضي مشرق بخطوط فضية ناعمة. يليق بأجمل الإطلالات.",
        },
        "dark-marble": {
          name: "الرخام الداكن",
          tag: "الليلي",
          desc: "أسود عميق بعروق فضية. صُنع لجلسات الليل والمكاتب السينمائية.",
        },
        "PINK-marble": {
         name: "الرخام الوردي",
         tag: "إصدار محدود",
          desc: "نسخة رخامية فاخرة.",
  },
      },
      cta: "عرض في المتجر",
      specTitle: "المواصفات",
      specs: [
        ["السطح", "نسيج ميكروي فائق النعومة"],
        ["القاعدة", "مطاط طبيعي مانع للانزلاق"],
        ["الحواف", "خياطة دقيقة لا تتفكك"],
        ["العناية", "قابل للغسل في الغسالة · بارد"],
      ],
    },
    about: {
      kicker: "من نحن",
      title: "صُمم لعشاق التفاصيل.",
      p1: "UR SETUP دار تصميم سعودية مُخصّصة للمكتب. نتعامل مع الإكسسوارات كما تتعامل المتاحف مع القطع الفنية — خامات مختارة، خطوط مُتقنة، وتفاصيل مهووسة.",
      p2: "نشحن من الرياض إلى دول الخليج، قطعةً مدروسةً في كل مرة.",
      cta: "زيارة المتجر",
    },
    why: {
      kicker: "لماذا UR SETUP",
      title: "تفاصيل يغفلها الآخرون.",
      items: [
        { t: "توصيل سريع", d: "شحن من الرياض مع تتبع للطلب في كل المملكة وما وراءها." },
        { t: "جودة معارض الفن", d: "بمظهر يليق بالكاميرا، وأداء يبقى معك لسنوات." },
        { t: "دفع آمن", d: "عبر متجرنا — بحماية كاملة من الطرفين." },
        { t: "دعم سريع", d: "فريقنا يجيب بالعربية والإنجليزية، طوال أيام الأسبوع." },
      ],
    },
    reviews: {
      kicker: "أصوات من المجتمع",
      title: "موثوقون لدى اللاعبين والمحترفين.",
      subtitle: "كل تقييم مكتوب من مالكٍ فعلي. لا نصوص جاهزة، ولا رعاية.",
      writeCta: "اكتب تقييمك",
      formTitle: "شاركنا تجربتك",
      name: "اسمك",
      country: "الدولة (اختياري)",
      product: "المنتج",
      rating: "التقييم",
      commentTitle: "العنوان (اختياري)",
      comment: "أخبرنا كيف كان الشعور",
      submit: "إرسال التقييم",
      submitting: "جارٍ الإرسال…",
      success: "شكرًا لك — تم نشر تقييمك.",
      error: "حدث خطأ. حاول مرة أخرى.",
      average: "متوسط التقييم",
      basedOn: (n) => `مبني على ${n} تقييم موثّق`,
      breakdown: "توزيع التقييمات",
      verified: "مالك موثّق",
      empty: "كن أول من يشارك تجربته.",
    },
    testimonials: {
      kicker: "مكاتب المجتمع",
      title: "مكاتب حقيقية. لاعبون حقيقيون.",
      subtitle: "لقطات مختارة من مجتمع UR SETUP عبر ثلاث قارات.",
    },
    faq: {
      kicker: "أسئلة · إجابات",
      title: "كل ما قد يخطر ببالك.",
      items: [
        { q: "أين تشحنون؟", a: "نشحن داخل المملكة العربية السعودية، ودول الخليج." },
        { q: "كم تستغرق مدة التوصيل؟", a: "داخل السعودية: من ٢ إلى ٤ أيام عمل. دول الخليج: يعتمد على الوجهة." },
        { q: "هل الماوس باد قابل للغسل؟", a: "نعم. ماء بارد ومنظف لطيف، ثم يُترك ليجف بشكل مسطح. الحواف لن تتفكك." },
        { q: "هل تقدمون طلبات جماعية للشركات؟", a: "نعم — لفرق الرياضات الإلكترونية والمكاتب والهدايا. تواصل معنا للتسعير." },
        { q: "ما هي سياسة الإرجاع؟", a: "سياسه الاستبدال والارجاع تجدونها عبر متجرنا." },
        { q: "هل يوجد ضمان على المنتجات؟", a: " تسوّق وأنت مطمئن! إذا لم يُعجبك المنتج أو لم يطابق توقعاتك, نضمن لك استرجاع كامل مبلغ المنتج خلال 7 أيام من الاستلام." },
        { q: "متى يمكنني التواصل معكم؟", a: "فريقنا متاح لخدمتكم 24 ساعة طوال أيام الأسبوع! ويوم الجمعة، نكون في خدمتكم من الساعة 1:30 مساءً وحتى 6:30 مساءً." },
      ],
    },
    newsletter: {
      kicker: "النشرة الداخلية",
      title: "إصدارات وعروض وإلهام للمكاتب.",
      subtitle: "رسالة مدروسة شهريًا. دون ازعاج أبدًا.",
      placeholder: "your@email.com",
      cta: "اشترك",
      success: "أنت الآن معنا. أهلاً بك في الداخل.",
      error: "الرجاء إدخال بريد إلكتروني صحيح.",
    },
    stats: {
      customers: "عملاء سعداء",
      orders: "طلبات مُشحنة",
      rating: "متوسط التقييم",
      secure: "دفع آمن",
    },
    contact: {
      kicker: "ننتظر رساتلك",
      title: "سعداء بوجودك معنا.",
      subtitle: "إنستقرام أو تيك توك أو متجرنا — نرد خلال يوم عمل واحد.",
      whatsapp: "تواصل واتساب",
    },
    footer: {
      tagline: "إكسسوارات سيت أب فاخرة، وُلدت في الرياض.",
      links: "روابط سريعة",
      social: "منصات التواصل",
      legal: "© {year} UR SETUP. جميع الحقوق محفوظة.",
      craft: "صُنع بحبٍّ في المملكة العربية السعودية.",
    },
    products_slugs: {
      "grey-marble": "الرخام الرمادي",
      "white-marble": "الرخام الأبيض",
      "dark-marble": "الرخام الداكن",
      "pink-marble": "الرخام الوردي",
    },
  },
};

export const PRODUCTS = [
  {
    slug: "grey-marble",
    img: "/OUSE.webp",
    storeUrl: "https://www.ursetup.store/",
    price: "SAR 129",
  },
  {
    slug: "white-marble",
    img: "wihte.webp",
    storeUrl: "https://www.ursetup.store/",
    price: "SAR 129",
  },
  {
    slug: "dark-marble",
    img: "black.webp",
    storeUrl: "https://www.ursetup.store/",
    price: "SAR 129",
  },
  {
  slug: "pink-marble",
  img: "pink.webp",
  storeUrl: "https://www.ursetup.store/",
  price: "SAR 129",
}
];

export const ASSETS = {
  logo: "/URSETUPLOGO.png",
  about: "/aboutus.png",
  hero: "all.webp",
  heroBg: "https://images.unsplash.com/photo-1747696766706-5485b39bf358?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85",
  setup1: "se.webp",
  setup2: "we.webp",
};
