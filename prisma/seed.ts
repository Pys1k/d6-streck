import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const hash = await bcrypt.hash(adminPassword, 12);

  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, passwordHash: hash },
  });
  console.log("Admin created:", adminUsername);

  const categoryDefs = [
    { name: "Ol", icon: "🍺", color: "#f59e0b" },
    { name: "Cider", icon: "🍏", color: "#10b981" },
    { name: "Vin", icon: "🍷", color: "#8b5cf6" },
    { name: "Sprit", icon: "🥃", color: "#f97316" },
    { name: "Shots", icon: "🥂", color: "#ec4899" },
    { name: "Blandat", icon: "🍹", color: "#06b6d4" },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    catMap[cat.name] = created.id;
  }
  console.log("Categories created");

  type ProductDef = {
    name: string;
    price: number;
    volume: number;
    packSize: number;
    packType: string;
    categoryName: string;
  };

  const products: ProductDef[] = [
    { name: "Falcon Export 5,2%", price: 17.9, volume: 500, packSize: 1, packType: "Burk", categoryName: "Ol" },
    { name: "Heineken 5%", price: 19.9, volume: 330, packSize: 1, packType: "Flaska", categoryName: "Ol" },
    { name: "Carlsberg 5%", price: 18.9, volume: 500, packSize: 1, packType: "Burk", categoryName: "Ol" },
    { name: "6-pack Falcon", price: 99.0, volume: 500, packSize: 6, packType: "6-pack", categoryName: "Ol" },
    { name: "12-pack Carlsberg", price: 189.0, volume: 330, packSize: 12, packType: "12-pack", categoryName: "Ol" },
    { name: "Rekorderlig Jordgubb", price: 22.9, volume: 500, packSize: 1, packType: "Flaska", categoryName: "Cider" },
    { name: "Kopparberg Paron", price: 21.9, volume: 500, packSize: 1, packType: "Flaska", categoryName: "Cider" },
    { name: "Absolut Vodka 70cl", price: 249.0, volume: 700, packSize: 1, packType: "Flaska", categoryName: "Sprit" },
    { name: "Jagermeister 70cl", price: 239.0, volume: 700, packSize: 1, packType: "Flaska", categoryName: "Sprit" },
    { name: "Are Single Malt", price: 349.0, volume: 700, packSize: 1, packType: "Flaska", categoryName: "Sprit" },
    { name: "Chateau Rott Vin", price: 149.0, volume: 750, packSize: 1, packType: "Flaska", categoryName: "Vin" },
    { name: "Pino Grigio Vit", price: 129.0, volume: 750, packSize: 1, packType: "Flaska", categoryName: "Vin" },
    { name: "Rose Provence", price: 159.0, volume: 750, packSize: 1, packType: "Flaska", categoryName: "Vin" },
  ];

  for (const p of products) {
    const catId = catMap[p.categoryName];
    if (!catId) {
      console.error("Missing category:", p.categoryName);
      continue;
    }
    await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        volume: p.volume,
        packSize: p.packSize,
        packType: p.packType,
        categoryId: catId,
      },
    });
  }
  console.log("Products created");

  const names = ["Erik", "Maja", "Oskar", "Linnea", "Gustav", "Saga"];
  const productList = await prisma.product.findMany({ select: { id: true, price: true } });

  for (let i = 0; i < 20; i++) {
    const person = names[Math.floor(Math.random() * names.length)];
    const product = productList[Math.floor(Math.random() * productList.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    await prisma.purchase.create({
      data: {
        personName: person,
        productId: product.id,
        quantity,
        totalCost: product.price * quantity,
        note: Math.random() > 0.7 ? "Fredagsmys!" : undefined,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("Sample purchases created");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
