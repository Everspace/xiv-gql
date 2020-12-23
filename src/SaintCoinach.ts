import fs from "fs"
import csv from "csv"
import lodash from "lodash"

export const csvParse = async <T = string[]>(filepath: string, opts?: any) => {
  const file = await fs.promises.readFile(filepath, { encoding: "utf-8" })
  return new Promise<T[]>((resolve, reject) => {
    //@ts-ignore csv.parse has weird definitions
    csv.parse(file, opts, (err, records, info) => {
      if (err) reject(err)
      resolve(records)
    })
  })
}

const GQL_TYPE_MAPPINGS: any = {
  bit: "Boolean!",
  bool: "Boolean!",
  byte: "Int!",
  int16: "Int!",
  int32: "Int!",
  int64: "Int!",
  sbyte: "Int!",
  single: "Boolean!",
  str: "String!",
  uint16: "Int!",
  uint32: "Int!",
}

const applyGqlTypeMappings = (typeName: string) => {
  const result = GQL_TYPE_MAPPINGS[typeName]
  if (result === undefined) return typeName
  return result
}

export async function coinachCsvHeaders(f: string) {
  const [columnNumbers, columnNames, types] = await csvParse<string[]>(f, {
    to: 3,
  })
  if (
    columnNumbers === undefined ||
    columnNames === undefined ||
    types === undefined
  ) {
    console.log(`${f} failed to parse csv`)
  }

  const results = lodash
    .zip(columnNumbers, columnNames)
    .map(([number, name]) => {
      if (name === undefined || name === "") {
        return `UnknownColumn${number}`
      }
      return name
    })

  return {
    columnNames: results,
    columnTypes: types.map(applyGqlTypeMappings),
  }
}
