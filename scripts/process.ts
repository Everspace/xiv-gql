import { joinalize, loadYaml } from "../src/FileUtils"
import lodash, { fromPairs, zip } from "lodash"
import path from "path"
import fs from "fs/promises"
import { coinachCsv } from "../src/SaintCoinach"

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

const doWork = async () => {
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
      json: data,
    } = await coinachCsv(f)

    const uncleanTypes = fromPairs(
      zip(
        solvedColumns.map((key) => applyRenameKeys(name, key)),
        types,
      ) as [string, string][],
    )

    const cleanJson = lodash(data).mapValues((d) => {
      return lodash(d)
        .mapKeys((_, key) => applyRenameKeys(name, key))
        .value()
    })

    const cleanTypes = lodash(uncleanTypes).mapKeys((_, key) =>
      applyRenameKeys(name, key),
    )

    const targetPathGQL = `./graphqlDefinitions/${name}.graphql`
    const targetPathJSON = `./graphqlDefinitions/${name}.json`
    fs.writeFile(targetPathJSON, JSON.stringify(cleanJson, null, 2))
    fs.writeFile(
      targetPathGQL,
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
