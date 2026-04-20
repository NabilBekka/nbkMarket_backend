import { pool } from "./db";

const wilayas = [
  { code: 1, name_fr: "Adrar", name_en: "Adrar" },
  { code: 2, name_fr: "Chlef", name_en: "Chlef" },
  { code: 3, name_fr: "Laghouat", name_en: "Laghouat" },
  { code: 4, name_fr: "Oum El Bouaghi", name_en: "Oum El Bouaghi" },
  { code: 5, name_fr: "Batna", name_en: "Batna" },
  { code: 6, name_fr: "Béjaïa", name_en: "Béjaïa" },
  { code: 7, name_fr: "Biskra", name_en: "Biskra" },
  { code: 8, name_fr: "Béchar", name_en: "Béchar" },
  { code: 9, name_fr: "Blida", name_en: "Blida" },
  { code: 10, name_fr: "Bouira", name_en: "Bouira" },
  { code: 11, name_fr: "Tamanrasset", name_en: "Tamanrasset" },
  { code: 12, name_fr: "Tébessa", name_en: "Tébessa" },
  { code: 13, name_fr: "Tlemcen", name_en: "Tlemcen" },
  { code: 14, name_fr: "Tiaret", name_en: "Tiaret" },
  { code: 15, name_fr: "Tizi Ouzou", name_en: "Tizi Ouzou" },
  { code: 16, name_fr: "Alger", name_en: "Algiers" },
  { code: 17, name_fr: "Djelfa", name_en: "Djelfa" },
  { code: 18, name_fr: "Jijel", name_en: "Jijel" },
  { code: 19, name_fr: "Sétif", name_en: "Sétif" },
  { code: 20, name_fr: "Saïda", name_en: "Saïda" },
  { code: 21, name_fr: "Skikda", name_en: "Skikda" },
  { code: 22, name_fr: "Sidi Bel Abbès", name_en: "Sidi Bel Abbès" },
  { code: 23, name_fr: "Annaba", name_en: "Annaba" },
  { code: 24, name_fr: "Guelma", name_en: "Guelma" },
  { code: 25, name_fr: "Constantine", name_en: "Constantine" },
  { code: 26, name_fr: "Médéa", name_en: "Médéa" },
  { code: 27, name_fr: "Mostaganem", name_en: "Mostaganem" },
  { code: 28, name_fr: "M'Sila", name_en: "M'Sila" },
  { code: 29, name_fr: "Mascara", name_en: "Mascara" },
  { code: 30, name_fr: "Ouargla", name_en: "Ouargla" },
  { code: 31, name_fr: "Oran", name_en: "Oran" },
  { code: 32, name_fr: "El Bayadh", name_en: "El Bayadh" },
  { code: 33, name_fr: "Illizi", name_en: "Illizi" },
  { code: 34, name_fr: "Bordj Bou Arréridj", name_en: "Bordj Bou Arréridj" },
  { code: 35, name_fr: "Boumerdès", name_en: "Boumerdès" },
  { code: 36, name_fr: "El Tarf", name_en: "El Tarf" },
  { code: 37, name_fr: "Tindouf", name_en: "Tindouf" },
  { code: 38, name_fr: "Tissemsilt", name_en: "Tissemsilt" },
  { code: 39, name_fr: "El Oued", name_en: "El Oued" },
  { code: 40, name_fr: "Khenchela", name_en: "Khenchela" },
  { code: 41, name_fr: "Souk Ahras", name_en: "Souk Ahras" },
  { code: 42, name_fr: "Tipaza", name_en: "Tipaza" },
  { code: 43, name_fr: "Mila", name_en: "Mila" },
  { code: 44, name_fr: "Aïn Defla", name_en: "Aïn Defla" },
  { code: 45, name_fr: "Naâma", name_en: "Naâma" },
  { code: 46, name_fr: "Aïn Témouchent", name_en: "Aïn Témouchent" },
  { code: 47, name_fr: "Ghardaïa", name_en: "Ghardaïa" },
  { code: 48, name_fr: "Relizane", name_en: "Relizane" },
  { code: 49, name_fr: "El M'Ghair", name_en: "El M'Ghair" },
  { code: 50, name_fr: "El Meniaâ", name_en: "El Meniaâ" },
  { code: 51, name_fr: "Ouled Djellal", name_en: "Ouled Djellal" },
  { code: 52, name_fr: "Bordj Badji Mokhtar", name_en: "Bordj Badji Mokhtar" },
  { code: 53, name_fr: "Béni Abbès", name_en: "Béni Abbès" },
  { code: 54, name_fr: "Timimoun", name_en: "Timimoun" },
  { code: 55, name_fr: "Touggourt", name_en: "Touggourt" },
  { code: 56, name_fr: "Djanet", name_en: "Djanet" },
  { code: 57, name_fr: "In Salah", name_en: "In Salah" },
  { code: 58, name_fr: "In Guezzam", name_en: "In Guezzam" },
  { code: 59, name_fr: "Aflou", name_en: "Aflou" },
  { code: 60, name_fr: "Barika", name_en: "Barika" },
  { code: 61, name_fr: "Ksar Chellala", name_en: "Ksar Chellala" },
  { code: 62, name_fr: "Messaad", name_en: "Messaad" },
  { code: 63, name_fr: "Aïn Oussera", name_en: "Aïn Oussera" },
  { code: 64, name_fr: "Boussaâda", name_en: "Boussaâda" },
  { code: 65, name_fr: "El Abiodh Sidi Cheikh", name_en: "El Abiodh Sidi Cheikh" },
  { code: 66, name_fr: "El Kantara", name_en: "El Kantara" },
  { code: 67, name_fr: "Bir El Ater", name_en: "Bir El Ater" },
  { code: 68, name_fr: "Ksar El Boukhari", name_en: "Ksar El Boukhari" },
  { code: 69, name_fr: "El Aricha", name_en: "El Aricha" },
];

async function seed() {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) FROM wilayas");
    if (parseInt(rows[0].count) > 0) {
      console.log("[SEED] Wilayas already exist, skipping.");
      process.exit(0);
    }

    console.log("[SEED] Inserting 69 wilayas...");

    for (const w of wilayas) {
      await pool.query(
        "INSERT INTO wilayas (code, name_fr, name_en) VALUES ($1, $2, $3)",
        [w.code, w.name_fr, w.name_en]
      );
    }

    console.log("[SEED] Done. 69 wilayas inserted.");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] Failed:", err);
    process.exit(1);
  }
}

seed();
