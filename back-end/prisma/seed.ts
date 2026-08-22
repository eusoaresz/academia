import { prisma } from "../lib/prisma";
import { type Prisma } from "../generated/prisma/client"

const notebooks: Prisma.NotebookCreateInput[] = [
    {
        modelo: "Aspire Go 15",
        marca: "Acer",
        processador: "Intel",
        preco: 2800,
        quant: 3
    },
    {
        modelo: "Nitro 5 AN515",
        marca: "Acer",
        processador: "Intel",
        preco: 5200,
        quant: 8
    },
    {
        modelo: "Inspiron 15 3000",
        marca: "Dell",
        processador: "Intel",
        preco: 3200,
        quant: 5
    },
    {
        modelo: "XPS 13",
        marca: "Dell",
        processador: "Intel",
        preco: 7800,
        quant: 2
    },
    {
        modelo: "Pavilion 15",
        marca: "HP",
        processador: "AMD",
        preco: 2900,
        quant: 7
    },
    {
        modelo: "Envy x360",
        marca: "HP",
        processador: "AMD",
        preco: 4500,
        quant: 4
    },
    {
        modelo: "ThinkPad E14",
        marca: "Lenovo",
        processador: "Intel",
        preco: 3800,
        quant: 6
    },
    {
        modelo: "Yoga 7i",
        marca: "Lenovo",
        processador: "Intel",
        preco: 6200,
        quant: 3
    },
    {
        modelo: "VivoBook 14",
        marca: "Asus",
        processador: "AMD",
        preco: 3100,
        quant: 9
    },
    {
        modelo: "ZenBook 14",
        marca: "Asus",
        processador: "Intel",
        preco: 6900,
        quant: 1
    },
    {
        modelo: "Ideapad 3",
        marca: "Lenovo",
        processador: "AMD",
        preco: 2700,
        quant: 12
    },
    {
        modelo: "Latitude 3420",
        marca: "Dell",
        processador: "Intel",
        preco: 4100,
        quant: 4
    },
    {
        modelo: "Spectre x360",
        marca: "HP",
        processador: "Intel",
        preco: 8500,
        quant: 2
    },
    {
        modelo: "ROG Strix G15",
        marca: "Asus",
        processador: "AMD",
        preco: 5800,
        quant: 5
    },
    {
        modelo: "Swift 3",
        marca: "Acer",
        processador: "AMD",
        preco: 3400,
        quant: 6
    },
    {
        modelo: "Legion 5",
        marca: "Lenovo",
        processador: "AMD",
        preco: 6100,
        quant: 3
    },
    {
        modelo: "ProBook 450",
        marca: "HP",
        processador: "Intel",
        preco: 3700,
        quant: 7
    },
    {
        modelo: "TUF Gaming A15",
        marca: "Asus",
        processador: "AMD",
        preco: 4900,
        quant: 4
    },
    {
        modelo: "Vostro 15",
        marca: "Dell",
        processador: "Intel",
        preco: 3000,
        quant: 10
    },
    {
        modelo: "Chromebook 314",
        marca: "Acer",
        processador: "Intel",
        preco: 2200,
        quant: 15
    },
    {
        modelo: "Surface Laptop 4",
        marca: "Microsoft",
        processador: "AMD",
        preco: 7200,
        quant: 2
    }
]

async function main() {
    try {
        await prisma.notebook.createMany({ data: notebooks })
        console.log(`${notebooks.length} Notebooks Cadastrados...`)
    } catch (error) {
        console.error("Erro nas Inclusões (Seeds):", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

await main()
