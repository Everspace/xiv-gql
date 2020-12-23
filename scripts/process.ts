import { joinalize, loadYaml } from "../src/FileUtils"
import lodash, { fromPairs, zip } from "lodash"
import path from "path"
import fs from "fs/promises"
import { coinachCsvHeaders } from "../src/SaintCoinach"

const config = loadYaml(__dirname, "process.config.yaml").toJSON()
const base = config.csvLocation
const renameKeys: Record<string, Record<string, string>> = config?.renameKeys

const applyRenameKeys = (sourceType: string, key: string) => {
  const mapping = Object.assign(
    {},
    renameKeys?.all ?? {},
    renameKeys[sourceType] ?? {},
  )
  if (mapping[key]) return mapping[key]
  return key
}

const gqlKeyHasType: Record<string, Record<string, string>> =
  config?.gqlKeyHasType

const applyGqlKeyHasType = (sourceType: string, key: string, value: string) => {
  const mapping = Object.assign(
    {},
    gqlKeyHasType?.all ?? {},
    gqlKeyHasType[sourceType] ?? {},
  )
  value = mapping[key] ? mapping[key] : value
  return value
}

const cleanTypeNames = (s: string) => {
  if (s.startsWith("bit&")) return "bit"
  return s
}

const doWork = async () => {
  const things = new Set<string>()
  fs.mkdir("./graphqlDefinitions", { recursive: true })
  const dirInfo = await fs.readdir(joinalize(base), { withFileTypes: true })
  const files = dirInfo
    .filter((f) => f.name.endsWith(".csv"))
    .map((f) => joinalize(base, f.name))

  for (const f of files) {
    const { name } = path.parse(f)

    const {
      columnNames: solvedColumns,
      columnTypes: types,
    } = await coinachCsvHeaders(f)

    const uncleanTypes = fromPairs(
      zip(solvedColumns, types) as [string, string][],
    )

    const cleanTypes = lodash(uncleanTypes)
      // TODO: Make this general
      .mapKeys((_, key) => key.replace(/[{}<>]/g, ""))
      .mapKeys((_, key) => applyRenameKeys(name, key))
      .mapValues(cleanTypeNames)

    const targetPath = `./graphqlDefinitions/${name}.graphql`
    fs.writeFile(
      targetPath,
      `type ${name} {
${cleanTypes
  .mapKeys((_, key) => lodash.camelCase(key))
  .toPairs()
  .map(([key, gqlTypeName]) => {
    gqlTypeName = applyGqlKeyHasType(name, key, gqlTypeName)
    return `  ${key}: ${gqlTypeName}`
  })
  .sort()
  .join("\n")}
}
`,
    )
  }
}

const main = async () => {
  console.log("Generating .graphql")
  await doWork()
  console.log("Finished generating .graphql")
}

main()
