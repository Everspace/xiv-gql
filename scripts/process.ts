import { joinalize, loadYaml } from "../src/common"
import csv from "csv"
import fs from "fs/promises"

const result = loadYaml(__dirname, "process.config.yaml")
const base = result.get("csvLocation") as string
const csvParse = async <T>(filepath: string, opts?: any) => {
  const file = await fs.readFile(filepath, { encoding: "utf-8" })
  return new Promise((resolve, reject) => {
    //@ts-ignore
    csv.parse(file, opts, (err, records, info) => {
      resolve(records)
    })
  })
}

const cleanTypeNames = (s: string) => {
  if (s.startsWith("bit&")) return "bit"
  return s
}

const doWork = async () => {
  const things = new Set<string>()
  const files = await (
    await fs.readdir(joinalize(base), { withFileTypes: true })
  )
    .filter((f) => f.name.endsWith(".csv"))
    .map((f) => joinalize(base, f.name))

  for (const f of files) {
    const [names, types]: string[][] = (await csvParse(f, {
      from: 2,
      to: 3,
    })) as string[][]
    types.map(cleanTypeNames).forEach((s) => things.add(s))
  }
  const log = await fs.open("./allTypes.txt", "w")
  await log.writeFile(Array.from(things).sort().join("\n"))
  await log.close()
}
doWork()
