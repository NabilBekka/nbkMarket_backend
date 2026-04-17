import { pool } from "./db";

const categories = [
  {
    name_en: "Food & Catering", name_fr: "Alimentation & Restauration",
    children: [
      { name_en: "General food store", name_fr: "Alimentation générale" },
      { name_en: "Supermarket / Grocery", name_fr: "Supermarché / Épicerie" },
      { name_en: "Fruits & Vegetables", name_fr: "Fruits & Légumes" },
      { name_en: "Butcher / Deli", name_fr: "Boucherie / Charcuterie" },
      { name_en: "Fish market", name_fr: "Poissonnerie" },
      { name_en: "Bakery / Pastry shop", name_fr: "Pâtisserie / Boulangerie" },
      { name_en: "Confectionery / Chocolate", name_fr: "Confiserie / Chocolaterie" },
      { name_en: "Dairy / Cheese shop", name_fr: "Produits laitiers / Fromagerie" },
      { name_en: "Coffee & Tea roaster", name_fr: "Torréfacteur / Café & Thé" },
      { name_en: "Catering", name_fr: "Traiteur" },
      { name_en: "Organic / Dietetics", name_fr: "Produits bio / Diététique" },
    ],
  },
  {
    name_en: "Fashion & Accessories", name_fr: "Mode & Accessoires",
    children: [
      { name_en: "Clothing (all types)", name_fr: "Vêtements (tous types)" },
      { name_en: "Women's clothing", name_fr: "Vêtements femme" },
      { name_en: "Men's clothing", name_fr: "Vêtements homme" },
      { name_en: "Children's clothing", name_fr: "Vêtements enfant" },
      { name_en: "Shoes", name_fr: "Chaussures" },
      { name_en: "Jewelry", name_fr: "Bijouterie / Joaillerie" },
      { name_en: "Leather goods / Bags", name_fr: "Maroquinerie / Sacs" },
      { name_en: "Watches", name_fr: "Montres" },
      { name_en: "Eyewear / Optics", name_fr: "Lunetterie / Optique" },
      { name_en: "Fashion accessories", name_fr: "Accessoires de mode" },
      { name_en: "Sewing / Fabric / Haberdashery", name_fr: "Couture / Tissu / Mercerie" },
    ],
  },
  {
    name_en: "Home & Decoration", name_fr: "Maison & Décoration",
    children: [
      { name_en: "Home (general)", name_fr: "Maison (général)" },
      { name_en: "Furniture", name_fr: "Meubles" },
      { name_en: "Interior decoration", name_fr: "Décoration intérieure" },
      { name_en: "Household linen", name_fr: "Linge de maison" },
      { name_en: "Lighting", name_fr: "Luminaires" },
      { name_en: "Rugs / Carpet", name_fr: "Tapis / Moquette" },
      { name_en: "Tableware / Dishes", name_fr: "Arts de la table / Vaisselle" },
      { name_en: "Curtains & Drapes", name_fr: "Rideaux & Voilages" },
      { name_en: "Gardening / Plants", name_fr: "Jardinage / Plantes" },
      { name_en: "Florist", name_fr: "Fleuriste" },
      { name_en: "Home accessories", name_fr: "Accessoires maison" },
    ],
  },
  {
    name_en: "Electronics & High-Tech", name_fr: "Électronique & High-Tech",
    children: [
      { name_en: "Electronics (general)", name_fr: "Électronique (général)" },
      { name_en: "Phones & Accessories", name_fr: "Téléphones & Accessoires" },
      { name_en: "Computers / PC", name_fr: "Informatique / PC" },
      { name_en: "Home appliances", name_fr: "Électroménager" },
      { name_en: "TV / Audio / Video", name_fr: "TV / Son / Image" },
      { name_en: "Video games / Gaming", name_fr: "Jeux vidéo / Gaming" },
      { name_en: "Cameras / Photography", name_fr: "Caméras / Photo" },
      { name_en: "Drones / Gadgets", name_fr: "Drones / Gadgets" },
    ],
  },
  {
    name_en: "Building & DIY", name_fr: "Bâtiment & Bricolage",
    children: [
      { name_en: "DIY (general)", name_fr: "Bricolage (général)" },
      { name_en: "Plumbing", name_fr: "Plomberie" },
      { name_en: "Electrical", name_fr: "Électricité" },
      { name_en: "Paint", name_fr: "Peinture" },
      { name_en: "Hardware store", name_fr: "Quincaillerie" },
      { name_en: "Building materials", name_fr: "Matériaux de construction" },
      { name_en: "Tiles / Ceramics", name_fr: "Carrelage / Faïence" },
      { name_en: "Woodwork / Aluminium", name_fr: "Menuiserie / Aluminium" },
      { name_en: "Locksmith", name_fr: "Serrurerie" },
    ],
  },
  {
    name_en: "Beauty & Wellness", name_fr: "Beauté & Bien-être",
    children: [
      { name_en: "Beauty (general)", name_fr: "Beauté (général)" },
      { name_en: "Cosmetics / Makeup", name_fr: "Cosmétiques / Maquillage" },
      { name_en: "Perfumery", name_fr: "Parfumerie" },
      { name_en: "Hair products", name_fr: "Coiffure (produits)" },
      { name_en: "Body care", name_fr: "Soins du corps" },
      { name_en: "Parapharmacy", name_fr: "Parapharmacie" },
      { name_en: "Herbalism", name_fr: "Herboristerie" },
    ],
  },
  {
    name_en: "Auto & Motorcycle", name_fr: "Auto & Moto",
    children: [
      { name_en: "Auto & Motorcycle (general)", name_fr: "Auto & Moto (général)" },
      { name_en: "Auto parts", name_fr: "Pièces auto" },
      { name_en: "Motorcycle parts", name_fr: "Pièces moto" },
      { name_en: "Car accessories", name_fr: "Accessoires auto" },
      { name_en: "Tires / Rims", name_fr: "Pneus / Jantes" },
      { name_en: "Oils & Lubricants", name_fr: "Huiles & Lubrifiants" },
    ],
  },
  {
    name_en: "Sports & Leisure", name_fr: "Sport & Loisirs",
    children: [
      { name_en: "Sports (general)", name_fr: "Sport (général)" },
      { name_en: "Sporting goods", name_fr: "Articles de sport" },
      { name_en: "Fitness equipment", name_fr: "Équipement fitness" },
      { name_en: "Camping / Hiking", name_fr: "Camping / Randonnée" },
      { name_en: "Fishing / Hunting", name_fr: "Pêche / Chasse" },
      { name_en: "Bikes & Scooters", name_fr: "Vélos & Trottinettes" },
    ],
  },
  {
    name_en: "Baby & Kids", name_fr: "Bébé & Enfant",
    children: [
      { name_en: "Baby & Kids (general)", name_fr: "Bébé & Enfant (général)" },
      { name_en: "Baby care", name_fr: "Puériculture" },
      { name_en: "Toys", name_fr: "Jouets" },
      { name_en: "Baby clothes", name_fr: "Vêtements bébé" },
      { name_en: "School supplies", name_fr: "Fournitures scolaires" },
    ],
  },
  {
    name_en: "Services & Crafts", name_fr: "Services & Artisanat",
    children: [
      { name_en: "Traditional crafts", name_fr: "Artisanat traditionnel" },
      { name_en: "Gifts / Souvenirs", name_fr: "Cadeaux / Souvenirs" },
      { name_en: "Bookstore / Stationery", name_fr: "Librairie / Papeterie" },
      { name_en: "Printing / Copy shop", name_fr: "Imprimerie / Reprographie" },
      { name_en: "Musical instruments", name_fr: "Instruments de musique" },
    ],
  },
  {
    name_en: "Animals", name_fr: "Animaux",
    children: [
      { name_en: "Pet shop (general)", name_fr: "Animalerie (général)" },
      { name_en: "Pet food", name_fr: "Alimentation animale" },
      { name_en: "Pet accessories", name_fr: "Accessoires animaux" },
    ],
  },
  {
    name_en: "Office & Professional", name_fr: "Bureau & Professionnel",
    children: [
      { name_en: "Office furniture", name_fr: "Mobilier de bureau" },
      { name_en: "Office supplies", name_fr: "Fournitures de bureau" },
      { name_en: "Professional / Industrial equipment", name_fr: "Équipement professionnel / Industriel" },
    ],
  },
];

async function seed() {
  try {
    // Check if categories already exist
    const { rows } = await pool.query("SELECT COUNT(*) FROM categories");
    if (parseInt(rows[0].count) > 0) {
      console.log("[SEED] Categories already exist, skipping.");
      process.exit(0);
    }

    console.log("[SEED] Inserting categories...");

    for (const parent of categories) {
      const { rows: parentRows } = await pool.query(
        "INSERT INTO categories (parent_id, name_en, name_fr) VALUES (NULL, $1, $2) RETURNING id",
        [parent.name_en, parent.name_fr]
      );
      const parentId = parentRows[0].id;

      for (const child of parent.children) {
        await pool.query(
          "INSERT INTO categories (parent_id, name_en, name_fr) VALUES ($1, $2, $3)",
          [parentId, child.name_en, child.name_fr]
        );
      }
    }

    console.log("[SEED] Done.");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] Failed:", err);
    process.exit(1);
  }
}

seed();
