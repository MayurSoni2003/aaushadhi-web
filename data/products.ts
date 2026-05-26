export type Product = {
  id: number;
  name: string;
  category: string;
  benefit: string;
  badge: string;
  image: string;
};

export const products: Product[] = [
  {
    id: 1,
    name: "Ashwagandha Powder",
    category: "Adaptogenic Herb",
    benefit: "Stress Relief & Vitality",
    badge: "100% ORGANIC",
    image: "/products/ashwagandha.png",
  },
  {
    id: 2,
    name: "Triphala Ghrutam",
    category: "Ayurvedic Formula",
    benefit: "Digestion & Detox",
    badge: "TRADITIONAL",
    image: "/products/triphala.png",
  },
  {
    id: 3,
    name: "Organic Turmeric Root",
    category: "Anti-inflammatory",
    benefit: "Joint Health & Immunity",
    badge: "NATURAL",
    image: "/products/turmeric.png",
  },
  {
    id: 4,
    name: "Amla Tablets",
    category: "Vitamin C Rich",
    benefit: "Immunity & Hair Health",
    badge: "AYURVEDIC",
    image: "/products/amla.png",
  },
  {
    id: 5,
    name: "Dried Neem & Tulsi",
    category: "Herbal Blend",
    benefit: "Skin Purification",
    badge: "HERBAL",
    image: "/products/neem-tulsi.png",
  },
  {
    id: 6,
    name: "Brahmi Leaf Powder",
    category: "Brain Tonic",
    benefit: "Memory & Focus",
    badge: "PURE",
    image: "/products/brahmi.png",
  },
];
